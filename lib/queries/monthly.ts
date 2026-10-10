import "server-only";
import { db } from "@/lib/db";
import { addDaysToKey, dateKeyToDb, dbDateToKey, monthRange, todayKey, zonedDateTime } from "@/lib/date-utils";

export type EmployeeMonthRow = {
  employeeId: string;
  name: string;
  code: string | null;
  department: string | null;
  workingDays: number;
  outings: number;
  completed: number;
  totalMinutes: number;
  avgMinutes: number;
  longestMinutes: number;
  /** Users who entered this employee's entries, most first: [{ name, count }] */
  enteredBy: { name: string; count: number }[];
};
export type DayMonthRow = { date: string; employeesOut: number; outings: number; completed: number; pending: number; totalMinutes: number };
export type DeptMonthRow = { department: string; employees: number; outings: number; totalMinutes: number; avgMinutes: number };
export type LocationMonthRow = { location: string; visits: number; employees: number; totalMinutes: number; avgMinutes: number };

export type UserMonthRow = {
  userId: string;
  name: string;
  role: "ADMIN" | "STAFF";
  added: number;
  markedIn: number;
  edited: number;
  deleted: number;
  lastActivity: string | null; // ISO
};

/** One movement, for the per-employee detail view. Times are ISO strings. */
export type MonthEntry = {
  id: string;
  employeeId: string;
  date: string;
  outTime: string;
  inTime: string | null;
  location: string;
  purpose: string | null;
  durationMinutes: number | null;
  status: "OUTSIDE" | "COMPLETED";
};

export type MonthlyReport = {
  year: number;
  month: number;
  summary: { outings: number; employeesOut: number; completed: number; pending: number; totalMinutes: number; avgMinutes: number; activeDays: number };
  employees: EmployeeMonthRow[];
  days: DayMonthRow[];
  departments: DeptMonthRow[];
  locations: LocationMonthRow[];
  users: UserMonthRow[];
  entries: MonthEntry[];
};

export function parseMonth(sp: Record<string, string | string[] | undefined>) {
  const [ty, tm] = todayKey().split("-").map(Number);
  const y = Number(sp.year);
  const m = Number(sp.month);
  const year = Number.isInteger(y) && y >= 2000 && y <= ty ? y : ty;
  let month = Number.isInteger(m) && m >= 1 && m <= 12 ? m : tm;
  if (year === ty && month > tm) month = tm;
  return { year, month };
}

const avg = (total: number, n: number) => (n ? Math.round(total / n) : 0);

/** All monthly tables from one query; a month is at most a few thousand rows. */
export async function getMonthlyReport(year: number, month: number): Promise<MonthlyReport> {
  const { from, to } = monthRange(year, month);
  const rows = await db.movement.findMany({
    where: { status: { not: "VOID" }, date: { gte: dateKeyToDb(from), lte: dateKeyToDb(to) } },
    orderBy: { outTime: "asc" },
    select: {
      id: true,
      date: true,
      outTime: true,
      inTime: true,
      status: true,
      durationMinutes: true,
      employeeId: true,
      purpose: { select: { name: true } },
      createdBy: { select: { name: true } },
      employee: { select: { name: true, code: true, department: { select: { name: true } } } },
      location: { select: { name: true } },
    },
  });

  const emp = new Map<string, EmployeeMonthRow & { days: Set<string>; entered: Map<string, number> }>();
  const day = new Map<string, DayMonthRow & { people: Set<string> }>();
  const dept = new Map<string, { people: Set<string>; outings: number; completed: number; totalMinutes: number }>();
  const loc = new Map<string, { people: Set<string>; visits: number; completed: number; totalMinutes: number }>();

  let completed = 0;
  let totalMinutes = 0;
  for (const r of rows) {
    const key = dbDateToKey(r.date);
    const mins = r.status === "COMPLETED" ? (r.durationMinutes ?? 0) : 0;
    const done = r.status === "COMPLETED";
    if (done) {
      completed++;
      totalMinutes += mins;
    }

    let e = emp.get(r.employeeId);
    if (!e) {
      e = {
        employeeId: r.employeeId,
        name: r.employee.name,
        code: r.employee.code,
        department: r.employee.department?.name ?? null,
        workingDays: 0,
        outings: 0,
        completed: 0,
        totalMinutes: 0,
        avgMinutes: 0,
        longestMinutes: 0,
        days: new Set(),
        enteredBy: [],
        entered: new Map<string, number>(),
      };
      emp.set(r.employeeId, e);
    }
    e.outings++;
    e.entered.set(r.createdBy.name, (e.entered.get(r.createdBy.name) ?? 0) + 1);
    e.days.add(key);
    if (done) {
      e.completed++;
      e.totalMinutes += mins;
      e.longestMinutes = Math.max(e.longestMinutes, mins);
    }

    const d = day.get(key) ?? { date: key, employeesOut: 0, outings: 0, completed: 0, pending: 0, totalMinutes: 0, people: new Set<string>() };
    d.outings++;
    d.people.add(r.employeeId);
    if (done) {
      d.completed++;
      d.totalMinutes += mins;
    } else d.pending++;
    day.set(key, d);

    const dn = r.employee.department?.name ?? "No Department";
    const dp = dept.get(dn) ?? { people: new Set<string>(), outings: 0, completed: 0, totalMinutes: 0 };
    dp.people.add(r.employeeId);
    dp.outings++;
    if (done) {
      dp.completed++;
      dp.totalMinutes += mins;
    }
    dept.set(dn, dp);

    const lp = loc.get(r.location.name) ?? { people: new Set<string>(), visits: 0, completed: 0, totalMinutes: 0 };
    lp.people.add(r.employeeId);
    lp.visits++;
    if (done) {
      lp.completed++;
      lp.totalMinutes += mins;
    }
    loc.set(r.location.name, lp);
  }

  const employees = [...emp.values()]
    .map(({ days, entered, ...e }) => ({
      ...e,
      workingDays: days.size,
      avgMinutes: avg(e.totalMinutes, e.completed),
      enteredBy: [...entered.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => (a.code ?? "~").localeCompare(b.code ?? "~") || a.name.localeCompare(b.name));

  // Who did what this month: entries added (by entry date) and Mark IN /
  // edits / deletes (by when they happened, from the audit log).
  const monthStart = zonedDateTime(from, "00:00");
  const monthEnd = zonedDateTime(addDaysToKey(to, 1), "00:00");
  const [createdBy, actions, users] = await Promise.all([
    db.movement.groupBy({
      by: ["createdById"],
      where: { date: { gte: dateKeyToDb(from), lte: dateKeyToDb(to) } },
      _count: true,
      _max: { createdAt: true },
    }),
    db.auditLog.groupBy({
      by: ["userId", "action"],
      where: { entityType: "Movement", action: { in: ["MARK_IN", "UPDATE", "VOID"] }, createdAt: { gte: monthStart, lt: monthEnd } },
      _count: true,
      _max: { createdAt: true },
    }),
    db.user.findMany({ select: { id: true, name: true, role: true } }),
  ]);
  const userRows = new Map<string, UserMonthRow>();
  const row = (id: string) => {
    let r = userRows.get(id);
    if (!r) {
      const u = users.find((x) => x.id === id);
      r = { userId: id, name: u?.name ?? "Deleted user", role: u?.role ?? "STAFF", added: 0, markedIn: 0, edited: 0, deleted: 0, lastActivity: null };
      userRows.set(id, r);
    }
    return r;
  };
  const touch = (r: UserMonthRow, at: Date | null | undefined) => {
    if (at && (!r.lastActivity || at.toISOString() > r.lastActivity)) r.lastActivity = at.toISOString();
  };
  for (const c of createdBy) {
    const r = row(c.createdById);
    r.added = c._count;
    touch(r, c._max.createdAt);
  }
  for (const a of actions) {
    if (!a.userId) continue;
    const r = row(a.userId);
    if (a.action === "MARK_IN") r.markedIn += a._count;
    else if (a.action === "UPDATE") r.edited += a._count;
    else if (a.action === "VOID") r.deleted += a._count;
    touch(r, a._max.createdAt);
  }

  return {
    year,
    month,
    entries: rows.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      date: dbDateToKey(r.date),
      outTime: r.outTime.toISOString(),
      inTime: r.inTime?.toISOString() ?? null,
      location: r.location.name,
      purpose: r.purpose?.name ?? null,
      durationMinutes: r.durationMinutes,
      status: r.status === "OUTSIDE" ? ("OUTSIDE" as const) : ("COMPLETED" as const),
    })),
    users: [...userRows.values()].sort((a, b) => b.added + b.markedIn - (a.added + a.markedIn) || a.name.localeCompare(b.name)),
    summary: {
      outings: rows.length,
      employeesOut: emp.size,
      completed,
      pending: rows.length - completed,
      totalMinutes,
      avgMinutes: avg(totalMinutes, completed),
      activeDays: day.size,
    },
    employees,
    days: [...day.values()].map(({ people, ...d }) => ({ ...d, employeesOut: people.size })).sort((a, b) => a.date.localeCompare(b.date)),
    departments: [...dept.entries()]
      .map(([department, v]) => ({ department, employees: v.people.size, outings: v.outings, totalMinutes: v.totalMinutes, avgMinutes: avg(v.totalMinutes, v.completed) }))
      .sort((a, b) => b.outings - a.outings),
    locations: [...loc.entries()]
      .map(([location, v]) => ({ location, visits: v.visits, employees: v.people.size, totalMinutes: v.totalMinutes, avgMinutes: avg(v.totalMinutes, v.completed) }))
      .sort((a, b) => b.visits - a.visits || b.totalMinutes - a.totalMinutes),
  };
}
