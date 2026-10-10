"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { type ActionResult, zodFieldErrors } from "@/lib/action-result";
import { audit, diff } from "@/lib/audit";
import { AuthError, getActionUser } from "@/lib/auth-guard";
import { authorizerSchema, blankToNull, locationSchema, purposeSchema } from "@/lib/validations";
import type { Permission } from "@/lib/permissions";

// Locations, purposes and authorized persons share the same lifecycle:
// create / edit / activate-deactivate, and hard delete only when unused.

export type MasterKind = "location" | "purpose" | "authorizer";

const LABEL: Record<MasterKind, string> = { location: "Location", purpose: "Purpose", authorizer: "Authorized person" };
const ENTITY: Record<MasterKind, string> = { location: "Location", purpose: "Purpose", authorizer: "AuthorizationPerson" };
const KIND_PERMISSION: Record<MasterKind, Permission> = { location: "masters.locations", purpose: "masters.purposes", authorizer: "masters.authorizers" };

type Row = { id: string; name: string; active: boolean; _count: { movements: number } };

// Narrow, typed accessors per table (Prisma delegates don't share a common type).
const repo = {
  location: {
    find: (id: string) => db.location.findUnique({ where: { id }, include: { _count: { select: { movements: true } } } }),
    setActive: (tx: Prisma.TransactionClient, id: string, active: boolean) => tx.location.update({ where: { id }, data: { active } }),
    remove: (tx: Prisma.TransactionClient, id: string) => tx.location.delete({ where: { id } }),
  },
  purpose: {
    find: (id: string) => db.purpose.findUnique({ where: { id }, include: { _count: { select: { movements: true } } } }),
    setActive: (tx: Prisma.TransactionClient, id: string, active: boolean) => tx.purpose.update({ where: { id }, data: { active } }),
    remove: async (tx: Prisma.TransactionClient, id: string) => {
      await tx.location.updateMany({ where: { defaultPurposeId: id }, data: { defaultPurposeId: null } });
      return tx.purpose.delete({ where: { id } });
    },
  },
  authorizer: {
    find: (id: string) => db.authorizationPerson.findUnique({ where: { id }, include: { _count: { select: { movements: true } } } }),
    setActive: (tx: Prisma.TransactionClient, id: string, active: boolean) =>
      tx.authorizationPerson.update({ where: { id }, data: { active } }),
    remove: (tx: Prisma.TransactionClient, id: string) => tx.authorizationPerson.delete({ where: { id } }),
  },
} satisfies Record<MasterKind, { find: (id: string) => Promise<Row | null>; setActive: unknown; remove: unknown }>;

class NotFound extends Error {}

function fail(error: unknown, kind: MasterKind): { ok: false; error: string; fieldErrors?: Record<string, string> } {
  if (error instanceof AuthError) return { ok: false, error: error.message };
  if (error instanceof NotFound) return { ok: false, error: `This ${LABEL[kind].toLowerCase()} no longer exists.` };
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return { ok: false, error: `${LABEL[kind]} with this name already exists.`, fieldErrors: { name: "This name is already used" } };
  }
  console.error(error);
  return { ok: false, error: "Something went wrong. Please try again." };
}

function done(message: string): ActionResult {
  revalidatePath("/master-data");
  return { ok: true, message };
}

export async function saveLocation(id: string | null, input: unknown): Promise<ActionResult> {
  try {
    const user = await getActionUser({ perm: "masters.locations" });
    const parsed = locationSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Please correct the highlighted fields.", fieldErrors: zodFieldErrors(parsed.error.issues) };
    const v = parsed.data;
    if (v.defaultPurposeId && !(await db.purpose.findUnique({ where: { id: v.defaultPurposeId } }))) {
      return { ok: false, error: "Selected purpose no longer exists.", fieldErrors: { defaultPurposeId: "Select a purpose" } };
    }
    const data = {
      name: v.name,
      area: blankToNull(v.area),
      city: blankToNull(v.city),
      defaultPurposeId: v.defaultPurposeId || null,
      active: v.active,
    };
    const saved = await db.$transaction(async (tx) => {
      if (!id) {
        const row = await tx.location.create({ data });
        await audit(tx, { entityType: "Location", entityId: row.id, action: "CREATE", userId: user.id, summary: `Location ${row.name} added`, changes: data });
        return row;
      }
      const before = await tx.location.findUnique({ where: { id } });
      if (!before) throw new NotFound();
      const row = await tx.location.update({ where: { id }, data });
      const changes = diff(before, data, ["name", "area", "city", "defaultPurposeId", "active"]);
      if (Object.keys(changes).length) {
        await audit(tx, { entityType: "Location", entityId: id, action: "UPDATE", userId: user.id, summary: `Location ${row.name} updated`, changes });
      }
      return row;
    });
    return done(id ? `${saved.name} updated successfully.` : `${saved.name} added successfully.`);
  } catch (error) {
    return fail(error, "location");
  }
}

export async function savePurpose(id: string | null, input: unknown): Promise<ActionResult> {
  try {
    const user = await getActionUser({ perm: "masters.purposes" });
    const parsed = purposeSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Please correct the highlighted fields.", fieldErrors: zodFieldErrors(parsed.error.issues) };
    const v = parsed.data;
    const data = { name: v.name, description: blankToNull(v.description), active: v.active };
    const saved = await db.$transaction(async (tx) => {
      if (!id) {
        const max = await tx.purpose.aggregate({ _max: { sortOrder: true } });
        const row = await tx.purpose.create({ data: { ...data, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
        await audit(tx, { entityType: "Purpose", entityId: row.id, action: "CREATE", userId: user.id, summary: `Purpose ${row.name} added`, changes: data });
        return row;
      }
      const before = await tx.purpose.findUnique({ where: { id } });
      if (!before) throw new NotFound();
      const row = await tx.purpose.update({ where: { id }, data });
      const changes = diff(before, data, ["name", "description", "active"]);
      if (Object.keys(changes).length) {
        await audit(tx, { entityType: "Purpose", entityId: id, action: "UPDATE", userId: user.id, summary: `Purpose ${row.name} updated`, changes });
      }
      return row;
    });
    return done(id ? `${saved.name} updated successfully.` : `${saved.name} added successfully.`);
  } catch (error) {
    return fail(error, "purpose");
  }
}

export async function saveAuthorizer(id: string | null, input: unknown): Promise<ActionResult> {
  try {
    const user = await getActionUser({ perm: "masters.authorizers" });
    const parsed = authorizerSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Please correct the highlighted fields.", fieldErrors: zodFieldErrors(parsed.error.issues) };
    const v = parsed.data;
    if (v.name.trim().toUpperCase() === "NIL") {
      return { ok: false, error: '"NIL" is used automatically when no one is selected.', fieldErrors: { name: "Leave Authorized By empty for NIL" } };
    }
    const data = { name: v.name, designation: blankToNull(v.designation), department: blankToNull(v.department), active: v.active };
    const saved = await db.$transaction(async (tx) => {
      if (!id) {
        const max = await tx.authorizationPerson.aggregate({ _max: { sortOrder: true } });
        const row = await tx.authorizationPerson.create({ data: { ...data, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
        await audit(tx, { entityType: "AuthorizationPerson", entityId: row.id, action: "CREATE", userId: user.id, summary: `Authorized person ${row.name} added`, changes: data });
        return row;
      }
      const before = await tx.authorizationPerson.findUnique({ where: { id } });
      if (!before) throw new NotFound();
      const row = await tx.authorizationPerson.update({ where: { id }, data });
      const changes = diff(before, data, ["name", "designation", "department", "active"]);
      if (Object.keys(changes).length) {
        await audit(tx, { entityType: "AuthorizationPerson", entityId: id, action: "UPDATE", userId: user.id, summary: `Authorized person ${row.name} updated`, changes });
      }
      return row;
    });
    return done(id ? `${saved.name} updated successfully.` : `${saved.name} added successfully.`);
  } catch (error) {
    return fail(error, "authorizer");
  }
}

export async function setMasterActive(kind: MasterKind, id: string, active: boolean): Promise<ActionResult> {
  try {
    const user = await getActionUser({ perm: KIND_PERMISSION[kind] });
    const row = await repo[kind].find(id);
    if (!row) throw new NotFound();
    if (row.active === active) return done(`${row.name} is already ${active ? "active" : "inactive"}.`);
    await db.$transaction(async (tx) => {
      await repo[kind].setActive(tx, id, active);
      await audit(tx, {
        entityType: ENTITY[kind],
        entityId: id,
        action: active ? "ACTIVATE" : "DEACTIVATE",
        userId: user.id,
        summary: `${LABEL[kind]} ${row.name} ${active ? "activated" : "deactivated"}`,
        changes: { active: { from: row.active, to: active } },
      });
    });
    return done(`${row.name} ${active ? "activated" : "deactivated"}.`);
  } catch (error) {
    return fail(error, kind);
  }
}

/** Permanently delete only when no movement references it; otherwise deactivate instead. */
export async function deleteMaster(kind: MasterKind, id: string): Promise<ActionResult> {
  try {
    const user = await getActionUser({ perm: KIND_PERMISSION[kind] });
    const row = await repo[kind].find(id);
    if (!row) throw new NotFound();
    if (row._count.movements > 0) {
      return { ok: false, error: `${row.name} is used in ${row._count.movements} movement records and cannot be deleted. Deactivate instead.` };
    }
    await db.$transaction(async (tx) => {
      await repo[kind].remove(tx, id);
      await audit(tx, { entityType: ENTITY[kind], entityId: id, action: "DELETE", userId: user.id, summary: `${LABEL[kind]} ${row.name} deleted` });
    });
    return done(`${row.name} deleted.`);
  } catch (error) {
    return fail(error, kind);
  }
}
