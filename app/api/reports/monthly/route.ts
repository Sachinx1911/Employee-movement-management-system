import { can, getActionUser } from "@/lib/auth-guard";
import { getAppSettings } from "@/lib/queries/settings";
import { monthlyCsv, monthlyPdf, monthlyXlsx, type MonthlyTab } from "@/lib/exports";
import { getMonthlyReport, parseMonth } from "@/lib/queries/monthly";

const TABS: (MonthlyTab | "detail")[] = ["employee", "day", "department", "location", "user", "detail"];

export async function GET(request: Request) {
  const user = await getActionUser().catch(() => null);
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!can(user, "reports.monthly")) return new Response("Forbidden", { status: 403 });

  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const { year, month } = parseMonth(sp);
  const tab = TABS.includes(sp.tab as MonthlyTab) ? (sp.tab as MonthlyTab | "detail") : "employee";
  const report = await getMonthlyReport(year, month, user.role);
  const name = `DDSR-Monthly-Report-${year}-${String(month).padStart(2, "0")}`;

  if (sp.format === "xlsx") {
    return new Response(new Uint8Array(await monthlyXlsx(report)), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${name}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  }
  if (sp.format === "pdf") {
    return new Response(new Uint8Array(monthlyPdf(report, (await getAppSettings()).company.name)), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}.pdf"`, "Cache-Control": "no-store" },
    });
  }
  if (sp.format === "csv") {
    const employee = tab === "detail" ? report.employees.find((e) => e.employeeId === sp.employee) : undefined;
    if (tab === "detail" && !employee) return new Response("Select an employee", { status: 400 });
    const suffix = employee ? `${(employee.code ?? "employee").replace(/[^\w-]/g, "")}-detail` : tab;
    return new Response(monthlyCsv(report, tab, employee?.employeeId), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}-${suffix}.csv"`, "Cache-Control": "no-store" },
    });
  }
  return new Response("Unknown format", { status: 400 });
}
