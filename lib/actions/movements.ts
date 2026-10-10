"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { audit, diff } from "@/lib/audit";
import { AuthError, can, getActionUser } from "@/lib/auth-guard";
import { addDaysToKey, dateKeyToDb, formatDateKey, formatTime, isDateKey, isTimeString, todayKey, zonedDateTime } from "@/lib/date-utils";
import { calculateDurationMinutes, formatDurationBadge } from "@/lib/duration-utils";
import { getAppSettings } from "@/lib/queries/settings";

// ───────────────────────── Save the New Entry grid ─────────────────────────

const rowSchema = z.object({
  key: z.string().min(1).max(64),
  id: z.string().optional(),
  employeeId: z.string(),
  locationId: z.string(),
  purposeId: z.string(),
  authorizedById: z.string(),
  outTime: z.string(),
  inTime: z.string(),
  inNextDay: z.boolean().optional(),
});
export type EntryRowInput = z.infer<typeof rowSchema>;

export type SaveEntriesResult =
  | { ok: true; message: string; created: number; updated: number; ids: Record<string, string> }
  | { ok: false; error: string; rowErrors?: Record<string, string> };

const FUTURE_GRACE_MS = 60_000;

type Interval = { key: string; employeeId: string; start: number; end: number; open: boolean };

function revalidateMovementViews() {
  for (const p of ["/new-entry", "/dashboard", "/daily-report", "/monthly-report"]) revalidatePath(p);
}

function failure(error: unknown): { ok: false; error: string } {
  if (error instanceof AuthError) return { ok: false, error: error.message };
  console.error(error);
  return { ok: false, error: "Something went wrong. Please try again." };
}

export async function saveDayEntries(date: string, input: unknown): Promise<SaveEntriesResult> {
  try {
    const user = await getActionUser({ perm: ["entries.create", "entries.markIn", "entries.editAll"] });
    const canEditAll = can(user, "entries.editAll");
    if (!isDateKey(date)) return { ok: false, error: "Date must be valid." };
    if (date > todayKey()) return { ok: false, error: "Entries cannot be made for a future date." };

    const parsed = z.array(rowSchema).max(200).safeParse(input);
    if (!parsed.success) return { ok: false, error: "Invalid entry data." };
    const rows = parsed.data;
    if (rows.length === 0) return { ok: false, error: "Nothing to save." };

    const { app: appSettings } = await getAppSettings();
    const rowErrors: Record<string, string> = {};
    const err = (key: string, msg: string) => {
      rowErrors[key] ??= msg;
    };

    // Reference data
    const existingIds = rows.map((r) => r.id).filter((x): x is string => !!x);
    const [existing, employees, locations, purposes, authorizers] = await Promise.all([
      db.movement.findMany({ where: { id: { in: existingIds } } }),
      db.employee.findMany({ where: { id: { in: rows.map((r) => r.employeeId).filter(Boolean) } }, select: { id: true, name: true, active: true } }),
      db.location.findMany({ where: { id: { in: rows.map((r) => r.locationId).filter(Boolean) } }, select: { id: true, active: true } }),
      db.purpose.findMany({ where: { id: { in: rows.map((r) => r.purposeId).filter(Boolean) } }, select: { id: true, active: true } }),
      db.authorizationPerson.findMany({ where: { id: { in: rows.map((r) => r.authorizedById).filter(Boolean) } }, select: { id: true, active: true } }),
    ]);
    const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]));
    const exMap = byId(existing);
    const empMap = byId(employees);
    const locMap = byId(locations);
    const purMap = byId(purposes);
    const authMap = byId(authorizers);

    // New rows need "create"; without "edit any entry" only today's entries that are still OUTSIDE can be changed.
    for (const r of rows) {
      if (!r.id) {
        if (!can(user, "entries.create")) err(r.key, "You do not have permission to create entries.");
        continue;
      }
      if (canEditAll) continue;
      const ex = exMap.get(r.id);
      if (!ex || ex.status !== "OUTSIDE" || date !== todayKey()) err(r.key, "You do not have permission to edit completed or older entries.");
    }

    const now = Date.now();
    type Prepared = { row: EntryRowInput; outAt: Date; inAt: Date | null };
    const prepared: Prepared[] = [];

    for (const row of rows) {
      const ex = row.id ? exMap.get(row.id) : undefined;
      if (row.id && (!ex || ex.status === "VOID")) {
        err(row.key, "This entry was deleted by someone else. Reload the page.");
        continue;
      }
      if (ex && ex.date.toISOString().slice(0, 10) !== date) {
        err(row.key, "This entry belongs to another date.");
        continue;
      }
      const emp = empMap.get(row.employeeId);
      if (!row.employeeId || !emp) {
        err(row.key, "Please select an employee.");
        continue;
      }
      if (!emp.active && emp.id !== ex?.employeeId) err(row.key, `${emp.name} is inactive.`);
      const loc = locMap.get(row.locationId);
      if (!row.locationId || !loc) {
        err(row.key, "Please select a location.");
        continue;
      }
      if (!loc.active && loc.id !== ex?.locationId) err(row.key, "Selected location is inactive.");
      if (row.purposeId) {
        const p = purMap.get(row.purposeId);
        if (!p) err(row.key, "Selected purpose no longer exists.");
        else if (!p.active && p.id !== ex?.purposeId) err(row.key, "Selected purpose is inactive.");
      }
      if (appSettings.requireAuthorization && !row.authorizedById) err(row.key, "Authorized By is required.");
      if (row.authorizedById) {
        const a = authMap.get(row.authorizedById);
        if (!a) err(row.key, "Selected authorized person no longer exists.");
        else if (!a.active && a.id !== ex?.authorizedById) err(row.key, "Selected authorized person is inactive.");
      }
      if (!isTimeString(row.outTime)) {
        err(row.key, "OUT time is required.");
        continue;
      }
      if (row.inTime && !isTimeString(row.inTime)) {
        err(row.key, "IN time is not valid.");
        continue;
      }
      const outAt = zonedDateTime(date, row.outTime);
      const inAt = row.inTime ? zonedDateTime(row.inNextDay ? addDaysToKey(date, 1) : date, row.inTime) : null;
      if (ex && ex.inTime && !inAt) err(row.key, "IN time cannot be blank on a completed entry.");
      if (outAt.getTime() > now + FUTURE_GRACE_MS) err(row.key, "OUT time cannot be in the future.");
      if (inAt && inAt.getTime() > now + FUTURE_GRACE_MS) err(row.key, "IN time cannot be in the future.");
      if (inAt && inAt < outAt) err(row.key, "IN time cannot be earlier than OUT time.");
      prepared.push({ row, outAt, inAt });
    }

    // Overlaps / double OUT within the day (saved rows not in this payload are included)
    const others = await db.movement.findMany({
      where: { date: dateKeyToDb(date), status: { not: "VOID" }, id: { notIn: existingIds } },
      select: { id: true, employeeId: true, outTime: true, inTime: true },
    });
    const intervals: Interval[] = [
      ...others.map((m) => ({
        key: `db:${m.id}`,
        employeeId: m.employeeId,
        start: m.outTime.getTime(),
        end: (m.inTime ?? new Date(now)).getTime(),
        open: !m.inTime,
      })),
      ...prepared.map((p) => ({
        key: p.row.key,
        employeeId: p.row.employeeId,
        start: p.outAt.getTime(),
        end: (p.inAt ?? new Date(Math.max(now, p.outAt.getTime()))).getTime(),
        open: !p.inAt,
      })),
    ];
    for (let i = 0; i < intervals.length; i++) {
      for (let j = i + 1; j < intervals.length; j++) {
        const a = intervals[i]!;
        const b = intervals[j]!;
        if (a.employeeId !== b.employeeId) continue;
        const name = empMap.get(a.employeeId)?.name ?? "This employee";
        const target = a.key.startsWith("db:") ? b.key : a.key;
        if (a.open && b.open) err(target, `${name} is already outside. Mark IN first.`);
        else if (a.start < b.end && b.start < a.end) err(target, `${name} has another entry overlapping this time.`);
      }
    }

    if (Object.keys(rowErrors).length) {
      const n = Object.keys(rowErrors).length;
      return { ok: false, error: `${n} row${n === 1 ? " needs" : "s need"} attention.`, rowErrors };
    }

    let created = 0;
    let updated = 0;
    const ids: Record<string, string> = {};
    await db.$transaction(async (tx) => {
      for (const { row, outAt, inAt } of prepared) {
        const durationMinutes = inAt ? calculateDurationMinutes(outAt, inAt) : null;
        const data = {
          employeeId: row.employeeId,
          locationId: row.locationId,
          purposeId: row.purposeId || null,
          authorizedById: row.authorizedById || null,
          outTime: outAt,
          inTime: inAt,
          durationMinutes,
          status: inAt ? ("COMPLETED" as const) : ("OUTSIDE" as const),
          activeEmployeeId: inAt ? null : row.employeeId,
        };
        if (row.id) {
          const before = exMap.get(row.id)!;
          const changes = diff(before, data, ["employeeId", "locationId", "purposeId", "authorizedById", "outTime", "inTime", "durationMinutes", "status"]);
          if (!Object.keys(changes).length) continue;
          await tx.movement.update({ where: { id: row.id }, data: { ...data, updatedById: user.id } });
          await audit(tx, {
            entityType: "Movement",
            entityId: row.id,
            action: !before.inTime && inAt && Object.keys(changes).every((k) => ["inTime", "durationMinutes", "status"].includes(k)) ? "MARK_IN" : "UPDATE",
            userId: user.id,
            summary: `Entry of ${empMap.get(row.employeeId)?.name} edited`,
            changes,
          });
          updated++;
        } else {
          const m = await tx.movement.create({ data: { ...data, date: dateKeyToDb(date), createdById: user.id } });
          ids[row.key] = m.id;
          await audit(tx, {
            entityType: "Movement",
            entityId: m.id,
            action: "CREATE",
            userId: user.id,
            summary: `${empMap.get(row.employeeId)?.name} OUT ${formatTime(outAt)}`,
            changes: { ...data, date },
          });
          created++;
        }
      }
    });

    revalidateMovementViews();
    const parts = [created && `${created} added`, updated && `${updated} updated`].filter(Boolean);
    return { ok: true, message: parts.length ? `Entries saved: ${parts.join(", ")}.` : "No changes to save.", created, updated, ids };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "An employee is already outside on another entry. Mark IN that entry first." };
    }
    return failure(error);
  }
}

// ───────────────────────── Mark IN ─────────────────────────

export type MarkInResult = { ok: true; message: string; durationMinutes: number } | { ok: false; error: string };

/** Capture IN time (now, or "HH:mm" today for corrections) and compute duration. */
export async function markIn(id: string, time?: string): Promise<MarkInResult> {
  try {
    const user = await getActionUser({ perm: "entries.markIn" });
    const m = await db.movement.findUnique({ where: { id }, include: { employee: { select: { name: true } } } });
    if (!m || m.status === "VOID") return { ok: false, error: "This entry no longer exists." };
    if (m.status !== "OUTSIDE" || m.inTime) return { ok: false, error: `${m.employee.name} is already marked IN.` };

    let inAt = new Date();
    if (time) {
      if (!isTimeString(time)) return { ok: false, error: "IN time is not valid." };
      inAt = zonedDateTime(todayKey(), time);
      if (inAt.getTime() > Date.now() + FUTURE_GRACE_MS) return { ok: false, error: "IN time cannot be in the future." };
    }
    if (inAt < m.outTime) return { ok: false, error: "IN time cannot be earlier than OUT time." };
    const durationMinutes = calculateDurationMinutes(m.outTime, inAt);

    await db.$transaction(async (tx) => {
      // Guard against a double click / two admins marking IN at once.
      const res = await tx.movement.updateMany({
        where: { id, status: "OUTSIDE" },
        data: { inTime: inAt, durationMinutes, status: "COMPLETED", activeEmployeeId: null, updatedById: user.id },
      });
      if (res.count !== 1) throw new AlreadyIn();
      await audit(tx, {
        entityType: "Movement",
        entityId: id,
        action: "MARK_IN",
        userId: user.id,
        summary: `${m.employee.name} marked IN at ${formatTime(inAt)}`,
        changes: { inTime: { from: null, to: inAt.toISOString() }, durationMinutes: { from: null, to: durationMinutes } },
      });
    });

    revalidateMovementViews();
    return { ok: true, message: `${m.employee.name} marked IN successfully. Duration: ${formatDurationBadge(durationMinutes)}.`, durationMinutes };
  } catch (error) {
    if (error instanceof AlreadyIn) return { ok: false, error: "This entry was already marked IN." };
    return failure(error);
  }
}

class AlreadyIn extends Error {}

// ───────────────────────── Void (soft delete) ─────────────────────────

export async function voidMovement(id: string, reason: string): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  try {
    const user = await getActionUser({ perm: "entries.delete" });
    const m = await db.movement.findUnique({ where: { id }, include: { employee: { select: { name: true } } } });
    if (!m || m.status === "VOID") return { ok: false, error: "This entry no longer exists." };
    const why = reason.trim().slice(0, 200) || null;
    await db.$transaction(async (tx) => {
      await tx.movement.update({
        where: { id },
        data: { status: "VOID", activeEmployeeId: null, voidedAt: new Date(), voidedById: user.id, voidReason: why, updatedById: user.id },
      });
      await audit(tx, {
        entityType: "Movement",
        entityId: id,
        action: "VOID",
        userId: user.id,
        summary: `Entry of ${m.employee.name} on ${formatDateKey(m.date.toISOString().slice(0, 10))} deleted${why ? `: ${why}` : ""}`,
        changes: { status: { from: m.status, to: "VOID" } },
      });
    });
    revalidateMovementViews();
    return { ok: true, message: `Entry of ${m.employee.name} deleted.` };
  } catch (error) {
    return failure(error);
  }
}

// ───────────────────────── Quick-create masters from the grid ─────────────────────────

const nameSchema = z.string().trim().min(1).max(80);

export async function quickCreateLocation(name: string): Promise<{ ok: true; id: string; name: string } | { ok: false; error: string }> {
  try {
    const user = await getActionUser({ perm: ["masters.quickAdd", "masters.locations"] });
    const n = nameSchema.safeParse(name);
    if (!n.success) return { ok: false, error: "Enter a location name." };
    const found = await db.location.findFirst({ where: { name: { equals: n.data } } });
    if (found) {
      if (!found.active) await db.location.update({ where: { id: found.id }, data: { active: true } });
      return { ok: true, id: found.id, name: found.name };
    }
    const loc = await db.$transaction(async (tx) => {
      const l = await tx.location.create({ data: { name: n.data } });
      await audit(tx, { entityType: "Location", entityId: l.id, action: "CREATE", userId: user.id, summary: `Location ${l.name} added from New Entry` });
      return l;
    });
    revalidatePath("/master-data");
    return { ok: true, id: loc.id, name: loc.name };
  } catch (error) {
    return failure(error);
  }
}

export async function quickCreatePurpose(name: string): Promise<{ ok: true; id: string; name: string } | { ok: false; error: string }> {
  try {
    const user = await getActionUser({ perm: ["masters.quickAdd", "masters.purposes"] });
    const n = nameSchema.safeParse(name);
    if (!n.success) return { ok: false, error: "Enter a purpose name." };
    const found = await db.purpose.findFirst({ where: { name: { equals: n.data } } });
    if (found) {
      if (!found.active) await db.purpose.update({ where: { id: found.id }, data: { active: true } });
      return { ok: true, id: found.id, name: found.name };
    }
    const max = await db.purpose.aggregate({ _max: { sortOrder: true } });
    const p = await db.$transaction(async (tx) => {
      const created = await tx.purpose.create({ data: { name: n.data, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
      await audit(tx, { entityType: "Purpose", entityId: created.id, action: "CREATE", userId: user.id, summary: `Purpose ${created.name} added from New Entry` });
      return created;
    });
    revalidatePath("/master-data");
    return { ok: true, id: p.id, name: p.name };
  } catch (error) {
    return failure(error);
  }
}
