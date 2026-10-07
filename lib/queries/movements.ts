import "server-only";
import { db } from "@/lib/db";
import { dateKeyToDb, dbDateToKey, toDateKey, toTimeInput, type DateKey } from "@/lib/date-utils";

export type EntryRow = {
  id: string;
  employeeId: string;
  locationId: string;
  purposeId: string;
  authorizedById: string;
  outTime: string; // "HH:mm"
  inTime: string; // "HH:mm" or ""
  /** inTime falls on a later calendar day than the entry date */
  inNextDay: boolean;
  durationMinutes: number | null;
  status: "OUTSIDE" | "COMPLETED";
};

/** Non-void movements of one business date, in OUT order. */
export async function getDayEntries(date: DateKey): Promise<EntryRow[]> {
  const rows = await db.movement.findMany({
    where: { date: dateKeyToDb(date), status: { not: "VOID" } },
    orderBy: [{ outTime: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((m) => ({
    id: m.id,
    employeeId: m.employeeId,
    locationId: m.locationId,
    purposeId: m.purposeId ?? "",
    authorizedById: m.authorizedById ?? "",
    outTime: toTimeInput(m.outTime),
    inTime: m.inTime ? toTimeInput(m.inTime) : "",
    inNextDay: !!m.inTime && toDateKey(m.inTime) !== dbDateToKey(m.date),
    durationMinutes: m.durationMinutes,
    status: m.status === "OUTSIDE" ? "OUTSIDE" : "COMPLETED",
  }));
}

export type PendingIn = { id: string; employee: string; location: string; purpose: string | null; date: DateKey; outTime: string };

/** Every movement still OUTSIDE (any date), oldest first. */
export async function getPendingIn(): Promise<PendingIn[]> {
  const rows = await db.movement.findMany({
    where: { status: "OUTSIDE" },
    orderBy: { outTime: "asc" },
    include: { employee: { select: { name: true } }, location: { select: { name: true } }, purpose: { select: { name: true } } },
  });
  return rows.map((m) => ({
    id: m.id,
    employee: m.employee.name,
    location: m.location.name,
    purpose: m.purpose?.name ?? null,
    date: dbDateToKey(m.date),
    outTime: m.outTime.toISOString(),
  }));
}

export type EntryOptions = {
  employees: { id: string; name: string; code: string | null; active: boolean }[];
  locations: { id: string; name: string; area: string | null; defaultPurposeId: string | null; active: boolean }[];
  purposes: { id: string; name: string; active: boolean }[];
  authorizers: { id: string; name: string; active: boolean }[];
};

/**
 * Options for the grid. Inactive records are included only when already used
 * on this date, so old rows still display their values.
 */
export async function getEntryOptions(used: EntryRow[]): Promise<EntryOptions> {
  const ids = (k: keyof EntryRow) => used.map((r) => r[k] as string).filter(Boolean);
  const activeOr = (list: string[]) => ({ OR: [{ active: true }, { id: { in: list } }] });
  const [employees, locations, purposes, authorizers] = await Promise.all([
    db.employee.findMany({ where: activeOr(ids("employeeId")), select: { id: true, name: true, code: true, active: true }, orderBy: { name: "asc" } }),
    db.location.findMany({ where: activeOr(ids("locationId")), select: { id: true, name: true, area: true, defaultPurposeId: true, active: true }, orderBy: { name: "asc" } }),
    db.purpose.findMany({ where: activeOr(ids("purposeId")), select: { id: true, name: true, active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.authorizationPerson.findMany({ where: activeOr(ids("authorizedById")), select: { id: true, name: true, active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  return { employees, locations, purposes, authorizers };
}
