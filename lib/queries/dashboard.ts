import "server-only";
import { format } from "date-fns";
import { db } from "@/lib/db";
import { addDaysToKey, dateKeyToDb, dbDateToKey, monthRange, todayKey, zonedDateTime } from "@/lib/date-utils";

const DAY_MS = 86_400_000;

/** Counts for the four master KPI cards; "added" = created in the last 30 days. */
export async function masterKpis() {
  const since = new Date(Date.now() - 30 * DAY_MS);
  const [eT, eA, eN, lT, lA, lN, pT, pA, pN, aT, aA, aN] = await Promise.all([
    db.employee.count(),
    db.employee.count({ where: { active: true } }),
    db.employee.count({ where: { createdAt: { gte: since } } }),
    db.location.count(),
    db.location.count({ where: { active: true } }),
    db.location.count({ where: { createdAt: { gte: since } } }),
    db.purpose.count(),
    db.purpose.count({ where: { active: true } }),
    db.purpose.count({ where: { createdAt: { gte: since } } }),
    db.authorizationPerson.count(),
    db.authorizationPerson.count({ where: { active: true } }),
    db.authorizationPerson.count({ where: { createdAt: { gte: since } } }),
  ]);
  return {
    employees: { total: eT, active: eA, added: eN },
    locations: { total: lT, active: lA, added: lN },
    purposes: { total: pT, active: pA, added: pN },
    authorizers: { total: aT, active: aA, added: aN },
  };
}

export type MonthPoint = { month: string; outings: number; employees: number };

/** Outings and distinct employees who went out, per month, for the last 6 months. */
export async function movementByMonth(): Promise<MonthPoint[]> {
  const [y, m] = todayKey().split("-").map(Number);
  const months: { y: number; m: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    months.push({ y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 });
  }
  const from = dateKeyToDb(monthRange(months[0]!.y, months[0]!.m).from);
  const to = dateKeyToDb(monthRange(y, m).to);

  const rows = await db.$queryRaw<{ month: string; outings: bigint | number; employees: bigint | number }[]>`
    SELECT DATE_FORMAT(\`date\`, '%Y-%m') AS month,
           COUNT(*) AS outings,
           COUNT(DISTINCT \`employeeId\`) AS employees
    FROM \`Movement\`
    WHERE \`status\` <> 'VOID' AND \`date\` BETWEEN ${from} AND ${to}
    GROUP BY month`;

  const byKey = new Map(rows.map((r) => [String(r.month), r]));
  return months.map(({ y: yy, m: mm }) => {
    const key = `${yy}-${String(mm).padStart(2, "0")}`;
    const r = byKey.get(key);
    return {
      month: format(new Date(Date.UTC(yy, mm - 1, 15)), "MMM yyyy"),
      outings: Number(r?.outings ?? 0),
      employees: Number(r?.employees ?? 0),
    };
  });
}

export type DayPoint = { day: string; completed: number; pending: number; total: number };

/** Entries per day for the last 7 days, split by completed vs still pending IN. */
export async function entriesLast7Days(): Promise<DayPoint[]> {
  const today = todayKey();
  const keys = Array.from({ length: 7 }, (_, i) => addDaysToKey(today, i - 6));
  const rows = await db.movement.groupBy({
    by: ["date", "status"],
    where: { status: { not: "VOID" }, date: { gte: dateKeyToDb(keys[0]!), lte: dateKeyToDb(today) } },
    _count: true,
  });
  return keys.map((key) => {
    const forDay = rows.filter((r) => dbDateToKey(r.date) === key);
    const completed = forDay.find((r) => r.status === "COMPLETED")?._count ?? 0;
    const pending = forDay.find((r) => r.status === "OUTSIDE")?._count ?? 0;
    const [, mm, dd] = key.split("-");
    const label = `${dd} ${format(new Date(Date.UTC(2000, Number(mm) - 1, 1)), "MMM")}`;
    return { day: label, completed, pending, total: completed + pending };
  });
}

/** Things created today plus today's entries and all pending INs. */
export async function todaySummary() {
  const today = todayKey();
  const start = zonedDateTime(today, "00:00");
  const end = new Date(start.getTime() + DAY_MS);
  const created = { createdAt: { gte: start, lt: end } };
  const [employees, locations, purposes, authorizers, entries, pending] = await Promise.all([
    db.employee.count({ where: created }),
    db.location.count({ where: created }),
    db.purpose.count({ where: created }),
    db.authorizationPerson.count({ where: created }),
    db.movement.count({ where: { date: dateKeyToDb(today), status: { not: "VOID" } } }),
    db.movement.count({ where: { status: "OUTSIDE" } }),
  ]);
  return { today, employees, locations, purposes, authorizers, entries, pending };
}
