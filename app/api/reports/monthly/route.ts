import { auth } from "@/auth";
import { getAppSettings } from "@/lib/queries/settings";
import { monthlyCsv, monthlyPdf, monthlyXlsx, type MonthlyTab } from "@/lib/exports";
import { getMonthlyReport, parseMonth } from "@/lib/queries/monthly";

const TABS: MonthlyTab[] = ["employee", "day", "department", "location", "user"];

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  if (session.user.role !== "ADMIN") return new Response("Forbidden", { status: 403 });

  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const { year, month } = parseMonth(sp);
  const tab = TABS.includes(sp.tab as MonthlyTab) ? (sp.tab as MonthlyTab) : "employee";
  const report = await getMonthlyReport(year, month);
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
    return new Response(monthlyCsv(report, tab), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}-${tab}.csv"`, "Cache-Control": "no-store" },
    });
  }
  return new Response("Unknown format", { status: 400 });
}
