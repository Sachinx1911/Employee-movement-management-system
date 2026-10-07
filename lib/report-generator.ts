// WhatsApp-ready daily report text. Pure function — used for the on-screen
// preview, the Copy button and exports, so all three always match.
import { formatDateKey, formatTimeReport, type DateKey } from "@/lib/date-utils";
import { formatDurationReport } from "@/lib/duration-utils";

export type ReportEntry = {
  id: string;
  location: string;
  purpose: string | null;
  authorizedBy: string | null;
  outTime: string; // ISO
  inTime: string | null; // ISO
  durationMinutes: number | null;
  status: "OUTSIDE" | "COMPLETED";
};

export type ReportEmployee = {
  employeeId: string;
  name: string;
  code: string | null;
  department: string | null;
  totalMinutes: number;
  outings: number;
  pending: number;
  entries: ReportEntry[];
};

export type ReportOptions = {
  title: string;
  showPurpose: boolean;
  showAuthorizedBy: boolean;
  showEmployeeTotal: boolean;
  showSeparator: boolean;
};

export const DEFAULT_REPORT_OPTIONS: ReportOptions = {
  title: "DAILY IN - OUT REPORT",
  showPurpose: true,
  showAuthorizedBy: true,
  showEmployeeTotal: true,
  showSeparator: true,
};

export function normalizeReportOptions(value: unknown): ReportOptions {
  const v = (value && typeof value === "object" ? value : {}) as Partial<Record<keyof ReportOptions, unknown>>;
  const bool = (k: keyof ReportOptions) => (typeof v[k] === "boolean" ? (v[k] as boolean) : (DEFAULT_REPORT_OPTIONS[k] as boolean));
  return {
    title: typeof v.title === "string" && v.title.trim() ? v.title.trim().slice(0, 60) : DEFAULT_REPORT_OPTIONS.title,
    showPurpose: bool("showPurpose"),
    showAuthorizedBy: bool("showAuthorizedBy"),
    showEmployeeTotal: bool("showEmployeeTotal"),
    showSeparator: bool("showSeparator"),
  };
}

const SEPARATOR = "--------------------------------";

export function buildWhatsAppReport(date: DateKey, employees: ReportEmployee[], options: ReportOptions): string {
  const lines: string[] = [`*${options.title}*`, `🗓️ ${formatDateKey(date)}`];
  const list = employees.filter((e) => e.entries.length > 0);

  if (list.length === 0) {
    lines.push("", "No movement entries found for this date.");
    return lines.join("\n");
  }

  list.forEach((emp, idx) => {
    if (idx > 0 && options.showSeparator) lines.push("", SEPARATOR);
    lines.push("", `▪️ *Employee Name: ${emp.name}*`);
    if (options.showEmployeeTotal) {
      const pendingNote = emp.pending ? ` (+${emp.pending} IN pending)` : "";
      lines.push(`Total Duration: ${formatDurationReport(emp.totalMinutes)}${pendingNote}`);
    }
    emp.entries.forEach((en, i) => {
      lines.push("", `${i + 1}) ${en.location}`);
      if (options.showPurpose) lines.push(`Purpose: ${en.purpose ?? "-"}`);
      if (options.showAuthorizedBy) lines.push(`Authorized By: ${en.authorizedBy ?? "NIL"}`);
      lines.push(`Out Time: ${formatTimeReport(new Date(en.outTime))}`);
      if (en.inTime) {
        lines.push(`In Time: ${formatTimeReport(new Date(en.inTime))}`);
        lines.push(`*Time Duration: ${formatDurationReport(en.durationMinutes)}*`);
      } else {
        lines.push("In Time: Pending (Currently Outside)");
        lines.push("*Time Duration: IN Time Pending*");
      }
    });
  });

  return lines.join("\n");
}
