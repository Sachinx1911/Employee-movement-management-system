import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { dateKeyToDb, type DateKey } from "@/lib/date-utils";
import { normalizeReportOptions, type ReportEmployee, type ReportOptions } from "@/lib/report-generator";

export type DailyFilters = { employeeId: string; departmentId: string; locationId: string };

export type DailyReport = {
  date: DateKey;
  employees: ReportEmployee[];
  summary: { employeesOut: number; outings: number; completed: number; pending: number; totalMinutes: number };
};

/** Only employees with at least one entry on the date are included. */
export async function getDailyReport(date: DateKey, f: DailyFilters): Promise<DailyReport> {
  const where: Prisma.MovementWhereInput = { date: dateKeyToDb(date), status: { not: "VOID" } };
  if (f.employeeId) where.employeeId = f.employeeId;
  if (f.locationId) where.locationId = f.locationId;
  if (f.departmentId) where.employee = { departmentId: f.departmentId };

  const rows = await db.movement.findMany({
    where,
    orderBy: { outTime: "asc" },
    include: {
      employee: { select: { id: true, name: true, code: true, department: { select: { name: true } } } },
      location: { select: { name: true } },
      purpose: { select: { name: true } },
      authorizedBy: { select: { name: true } },
    },
  });

  const map = new Map<string, ReportEmployee>();
  for (const m of rows) {
    let emp = map.get(m.employeeId);
    if (!emp) {
      emp = {
        employeeId: m.employeeId,
        name: m.employee.name,
        code: m.employee.code,
        department: m.employee.department?.name ?? null,
        totalMinutes: 0,
        outings: 0,
        pending: 0,
        entries: [],
      };
      map.set(m.employeeId, emp);
    }
    emp.outings++;
    if (m.status === "COMPLETED") emp.totalMinutes += m.durationMinutes ?? 0;
    else emp.pending++;
    emp.entries.push({
      id: m.id,
      location: m.location.name,
      purpose: m.purpose?.name ?? null,
      authorizedBy: m.authorizedBy?.name ?? null,
      outTime: m.outTime.toISOString(),
      inTime: m.inTime?.toISOString() ?? null,
      durationMinutes: m.durationMinutes,
      status: m.status === "OUTSIDE" ? "OUTSIDE" : "COMPLETED",
    });
  }


  const employees = [...map.values()].sort((a, b) => (a.code ?? "~").localeCompare(b.code ?? "~") || a.name.localeCompare(b.name));
  const withMovement = employees.filter((e) => e.outings > 0);
  return {
    date,
    employees,
    summary: {
      employeesOut: withMovement.length,
      outings: rows.length,
      completed: rows.filter((r) => r.status === "COMPLETED").length,
      pending: rows.filter((r) => r.status === "OUTSIDE").length,
      totalMinutes: withMovement.reduce((s, e) => s + e.totalMinutes, 0),
    },
  };
}

export async function getReportOptions(): Promise<ReportOptions> {
  const row = await db.setting.findUnique({ where: { key: "whatsappReport" } });
  return normalizeReportOptions(row?.value);
}

export async function getFilterOptions() {
  const [employees, departments, locations] = await Promise.all([
    db.employee.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.department.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.location.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return { employees, departments, locations };
}

export function parseDailyFilters(sp: Record<string, string | string[] | undefined>): DailyFilters {
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).slice(0, 40) : "");
  return { employeeId: s("employee"), departmentId: s("department"), locationId: s("location") };
}
