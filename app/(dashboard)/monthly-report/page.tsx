import type { Metadata } from "next";
import { MonthlyReportView } from "@/components/monthly-report/monthly-report-view";
import { requireAdmin } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { todayKey } from "@/lib/date-utils";
import { getMonthlyReport, parseMonth } from "@/lib/queries/monthly";

export const metadata: Metadata = { title: "Monthly Report" };

export default async function MonthlyReportPage({ searchParams }: PageProps<"/monthly-report">) {
  await requireAdmin();
  const { year, month } = parseMonth(await searchParams);
  const [ty, tm] = todayKey().split("-").map(Number);

  const [report, first] = await Promise.all([
    getMonthlyReport(year, month),
    db.movement.findFirst({ orderBy: { date: "asc" }, select: { date: true } }),
  ]);
  const firstYear = Math.min(first?.date.getUTCFullYear() ?? ty, ty);
  const years = Array.from({ length: ty - firstYear + 1 }, (_, i) => ty - i);
  const maxMonthForYear = Object.fromEntries(years.map((y) => [y, y === ty ? tm : 12]));

  return <MonthlyReportView key={`${year}-${month}`} report={report} years={years} maxMonthForYear={maxMonthForYear} />;
}
