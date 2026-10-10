import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DailyReportView } from "@/components/daily-report/daily-report-view";
import { can, requirePermission } from "@/lib/auth-guard";
import { isDateKey, todayKey } from "@/lib/date-utils";
import { getDailyReport, getFilterOptions, getReportOptions, parseDailyFilters } from "@/lib/queries/reports";

export const metadata: Metadata = { title: "Daily Report" };

export default async function DailyReportPage({ searchParams }: PageProps<"/daily-report">) {
  const user = await requirePermission("reports.daily");
  const sp = await searchParams;
  const today = todayKey();
  const raw = typeof sp.date === "string" ? sp.date : today;
  if (!isDateKey(raw) || raw > today) redirect("/daily-report");

  const filters = parseDailyFilters(sp);
  const options = await getReportOptions();
  const [report, filterOptions] = await Promise.all([getDailyReport(raw, filters), getFilterOptions()]);

  return (
    <DailyReportView
      key={`${raw}|${filters.employeeId}|${filters.departmentId}|${filters.locationId}`}
      date={raw}
      filters={filters}
      report={report}
      initialOptions={options}
      filterOptions={filterOptions}
      canSaveOptions={can(user, "reports.dailyOptions")}
    />
  );
}
