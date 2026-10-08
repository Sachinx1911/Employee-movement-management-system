"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { type ActionResult, zodFieldErrors } from "@/lib/action-result";
import { audit, diff } from "@/lib/audit";
import { AuthError, getActionUser } from "@/lib/auth-guard";
import { dateKeyToDb, dbDateToKey, monthRange, todayKey } from "@/lib/date-utils";
import { blankToNull, departmentNameSchema, employeeSchema } from "@/lib/validations";

const FIELDS = ["name", "code", "departmentId", "designation", "mobile", "email", "joiningDate", "address", "notes", "active"] as const;

class NotFound extends Error {}

function fail(error: unknown): { ok: false; error: string } {
  if (error instanceof AuthError) return { ok: false, error: error.message };
  console.error(error);
  return { ok: false, error: "Something went wrong. Please try again." };
}

export async function saveEmployee(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getActionUser({ admin: true });
    const parsed = employeeSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Please correct the highlighted fields.", fieldErrors: zodFieldErrors(parsed.error.issues) };
    }
    const v = parsed.data;
    const department = await db.department.findUnique({ where: { id: v.departmentId } });
    if (!department) {
      return { ok: false, error: "Selected department no longer exists.", fieldErrors: { departmentId: "Select a department" } };
    }

    const data = {
      name: v.name,
      code: v.code.toUpperCase(),
      departmentId: v.departmentId,
      designation: blankToNull(v.designation),
      mobile: blankToNull(v.mobile),
      email: blankToNull(v.email)?.toLowerCase() ?? null,
      joiningDate: v.joiningDate ? dateKeyToDb(v.joiningDate) : null,
      address: blankToNull(v.address),
      notes: blankToNull(v.notes),
      active: v.active,
    };

    const saved = await db.$transaction(async (tx) => {
      if (!id) {
        const created = await tx.employee.create({ data });
        await audit(tx, {
          entityType: "Employee",
          entityId: created.id,
          action: "CREATE",
          userId: user.id,
          summary: `Employee ${created.name} (${created.code}) added`,
          changes: { ...data, joiningDate: v.joiningDate || null },
        });
        return created;
      }
      const before = await tx.employee.findUnique({ where: { id } });
      if (!before) throw new NotFound();
      if (before.active && !data.active && (await tx.movement.findUnique({ where: { activeEmployeeId: id } }))) {
        throw new StillOutside(before.name);
      }
      const updated = await tx.employee.update({ where: { id }, data });
      const changes = diff(before, data, [...FIELDS]);
      if (Object.keys(changes).length) {
        await audit(tx, {
          entityType: "Employee",
          entityId: id,
          action: before.active !== data.active ? (data.active ? "ACTIVATE" : "DEACTIVATE") : "UPDATE",
          userId: user.id,
          summary: `Employee ${updated.name} updated`,
          changes,
        });
      }
      return updated;
    });

    revalidatePath("/master-data");
    return {
      ok: true,
      message: id ? `${saved.name} updated successfully.` : `${saved.name} added successfully.`,
      data: { id: saved.id },
    };
  } catch (error) {
    if (error instanceof NotFound) return { ok: false, error: "This employee no longer exists." };
    if (error instanceof StillOutside) return { ok: false, error: error.message, fieldErrors: { active: error.message } };
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "Employee code already exists.", fieldErrors: { code: "This code is already used by another employee" } };
    }
    return fail(error);
  }
}

class StillOutside extends Error {
  constructor(name: string) {
    super(`${name} is currently outside. Mark IN before deactivating.`);
  }
}

export async function setEmployeeActive(id: string, active: boolean): Promise<ActionResult> {
  try {
    const user = await getActionUser({ admin: true });
    const emp = await db.employee.findUnique({ where: { id } });
    if (!emp) return { ok: false, error: "This employee no longer exists." };
    if (emp.active === active) return { ok: true, message: `${emp.name} is already ${active ? "active" : "inactive"}.` };
    if (!active && (await db.movement.findUnique({ where: { activeEmployeeId: id } }))) {
      return { ok: false, error: new StillOutside(emp.name).message };
    }
    await db.$transaction(async (tx) => {
      await tx.employee.update({ where: { id }, data: { active } });
      await audit(tx, {
        entityType: "Employee",
        entityId: id,
        action: active ? "ACTIVATE" : "DEACTIVATE",
        userId: user.id,
        summary: `Employee ${emp.name} ${active ? "activated" : "deactivated"}`,
        changes: { active: { from: emp.active, to: active } },
      });
    });
    revalidatePath("/master-data");
    return { ok: true, message: `${emp.name} ${active ? "activated" : "deactivated"}.` };
  } catch (error) {
    return fail(error);
  }
}

/** Hard delete only when there is no movement history; otherwise the UI offers deactivate. */
export async function deleteEmployee(id: string): Promise<ActionResult> {
  try {
    const user = await getActionUser({ admin: true });
    const emp = await db.employee.findUnique({ where: { id }, include: { _count: { select: { movements: true } } } });
    if (!emp) return { ok: false, error: "This employee no longer exists." };
    if (emp._count.movements > 0) {
      return { ok: false, error: `${emp.name} has movement history and cannot be deleted. Deactivate instead.` };
    }
    await db.$transaction(async (tx) => {
      await tx.employee.delete({ where: { id } });
      await audit(tx, {
        entityType: "Employee",
        entityId: id,
        action: "DELETE",
        userId: user.id,
        summary: `Employee ${emp.name} (${emp.code ?? "no code"}) deleted`,
        changes: { name: emp.name, code: emp.code },
      });
    });
    revalidatePath("/master-data");
    return { ok: true, message: `${emp.name} deleted.` };
  } catch (error) {
    return fail(error);
  }
}

export async function createDepartment(name: string): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    const user = await getActionUser({ admin: true });
    const parsed = departmentNameSchema.safeParse(name);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };
    const existing = await db.department.findFirst({ where: { name: { equals: parsed.data } } });
    if (existing) {
      if (!existing.active) await db.department.update({ where: { id: existing.id }, data: { active: true } });
      return { ok: true, message: `${existing.name} selected.`, data: { id: existing.id, name: existing.name } };
    }
    const dept = await db.$transaction(async (tx) => {
      const d = await tx.department.create({ data: { name: parsed.data } });
      await audit(tx, { entityType: "Department", entityId: d.id, action: "CREATE", userId: user.id, summary: `Department ${d.name} added` });
      return d;
    });
    revalidatePath("/master-data");
    return { ok: true, message: `Department ${dept.name} added.`, data: { id: dept.id, name: dept.name } };
  } catch (error) {
    return fail(error);
  }
}

export type EmployeeDetails = {
  totalOutings: number;
  monthOutings: number;
  monthMinutes: number;
  currentlyOutside: { location: string; outTime: string } | null;
  lastMovement: { date: string; location: string } | null;
};

export async function getEmployeeDetails(id: string): Promise<ActionResult<EmployeeDetails>> {
  try {
    await getActionUser();
    const [y, m] = todayKey().split("-").map(Number);
    const { from, to } = monthRange(y, m);
    const notVoid = { employeeId: id, status: { not: "VOID" as const } };
    const [totalOutings, month, outside, last] = await Promise.all([
      db.movement.count({ where: notVoid }),
      db.movement.aggregate({
        where: { ...notVoid, date: { gte: dateKeyToDb(from), lte: dateKeyToDb(to) } },
        _count: true,
        _sum: { durationMinutes: true },
      }),
      db.movement.findUnique({ where: { activeEmployeeId: id }, include: { location: { select: { name: true } } } }),
      db.movement.findFirst({ where: notVoid, orderBy: { outTime: "desc" }, include: { location: { select: { name: true } } } }),
    ]);
    return {
      ok: true,
      message: "",
      data: {
        totalOutings,
        monthOutings: month._count,
        monthMinutes: month._sum.durationMinutes ?? 0,
        currentlyOutside: outside ? { location: outside.location.name, outTime: outside.outTime.toISOString() } : null,
        lastMovement: last ? { date: dbDateToKey(last.date), location: last.location.name } : null,
      },
    };
  } catch (error) {
    return fail(error);
  }
}
