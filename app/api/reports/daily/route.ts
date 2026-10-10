import { can, getActionUser } from "@/lib/auth-guard";
import { getAppSettings } from "@/lib/queries/settings";
import { isDateKey, todayKey } from "@/lib/date-utils";
import { dailyCsv, dailyPdf, dailyXlsx } from "@/lib/exports";
import { getDailyReport, parseDailyFilters } from "@/lib/queries/reports";

export async function GET(request: Request) {
  const user = await getActionUser().catch(() => null);
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!can(user, "reports.daily")) return new Response("Forbidden", { status: 403 });

  const url = new URL(request.url);
  const sp = Object.fromEntries(url.searchParams);
  const date = sp.date && isDateKey(sp.date) ? sp.date : todayKey();
  const format = sp.format;
  const report = await getDailyReport(date, parseDailyFilters(sp));
  const name = `DDSR-Daily-Report-${date}`;

  if (format === "xlsx") {
    return new Response(new Uint8Array(await dailyXlsx(report)), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${name}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  }
  if (format === "pdf") {
    return new Response(new Uint8Array(dailyPdf(report, (await getAppSettings()).company.name)), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}.pdf"`, "Cache-Control": "no-store" },
    });
  }
  if (format === "csv") {
    return new Response(dailyCsv(report), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.csv"`, "Cache-Control": "no-store" },
    });
  }
  return new Response("Unknown format", { status: 400 });
}
