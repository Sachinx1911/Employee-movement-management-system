"use client";

import {
  ArrowLeftRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock3,
  Copy,
  FileSpreadsheet,
  FileText,
  ListChecks,
  Loader2,
  Printer,
  Timer,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { saveReportOptions } from "@/lib/actions/settings";
import { addDaysToKey, formatDateKey, formatTime, todayKey, type DateKey } from "@/lib/date-utils";
import { formatDuration, formatDurationReport } from "@/lib/duration-utils";
import type { DailyFilters, DailyReport } from "@/lib/queries/reports";
import { buildWhatsAppReport, type ReportEmployee, type ReportOptions } from "@/lib/report-generator";
import { cn } from "@/lib/utils";

type Opt = { id: string; name: string };
const OPTION_ROWS: { key: "showPurpose" | "showAuthorizedBy" | "showEmployeeTotal" | "showSeparator"; label: string; hint: string }[] = [
  { key: "showPurpose", label: "Show Purpose", hint: "Purpose line under each entry" },
  { key: "showAuthorizedBy", label: "Show Authorized By", hint: "Authorized By line (NIL when empty)" },
  { key: "showEmployeeTotal", label: "Show Employee Total", hint: "Total Duration under each name" },
  { key: "showSeparator", label: "Separator Line", hint: "Dashed line between employees" },
];

/** Render WhatsApp *bold* markers as bold in the preview. */
function WhatsAppPreview({ text }: { text: string }) {
  return (
    <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-[1.45] text-foreground">
      {text.split("\n").map((line, i) => (
        <Fragment key={i}>
          {line.split(/(\*[^*\n]+\*)/g).map((part, j) =>
            part.startsWith("*") && part.endsWith("*") && part.length > 2 ? <b key={j}>{part.slice(1, -1)}</b> : <Fragment key={j}>{part}</Fragment>,
          )}
          {"\n"}
        </Fragment>
      ))}
    </pre>
  );
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

function FilterSelect({ label, value, onChange, all, options }: { label: string; value: string; onChange: (v: string) => void; all: string; options: Opt[] }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <div className="text-sm font-semibold">{label}</div>
      <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? "" : v)}>
        <SelectTrigger className="h-10! w-full" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{all}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function EntriesTable({ emp }: { emp: ReportEmployee }) {
  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr className="bg-muted/60 text-left [&>th]:h-9 [&>th]:px-3 [&>th]:font-semibold">
          <th className="w-10">#</th>
          <th>Location / Place</th>
          <th>Purpose</th>
          <th>Authorized By</th>
          <th>OUT Time</th>
          <th>IN Time</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>
        {emp.entries.map((e, i) => (
          <tr key={e.id} className="border-t [&>td]:h-9 [&>td]:px-3">
            <td className="tabular">{i + 1}</td>
            <td className="font-medium">{e.location}</td>
            <td>{e.purpose ?? "-"}</td>
            <td>{e.authorizedBy ?? "NIL"}</td>
            <td className="tabular">{formatTime(new Date(e.outTime))}</td>
            <td className="tabular">{e.inTime ? formatTime(new Date(e.inTime)) : <span className="text-amber-600">Pending</span>}</td>
            <td className="tabular font-medium">{e.inTime ? formatDurationReport(e.durationMinutes) : "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DailyReportView({
  date,
  filters,
  report,
  initialOptions,
  filterOptions,
  isAdmin,
}: {
  date: DateKey;
  filters: DailyFilters;
  report: DailyReport;
  initialOptions: ReportOptions;
  filterOptions: { employees: Opt[]; departments: Opt[]; locations: Opt[] };
  isAdmin: boolean;
}) {
  const router = useRouter();
  const today = todayKey();
  const [navigating, startNav] = useTransition();
  const [draft, setDraft] = useState({ date, ...filters });
  const [options, setOptions] = useState(initialOptions);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const text = useMemo(() => buildWhatsAppReport(date, report.employees, options), [date, report.employees, options]);
  const s = report.summary;
  const withMovement = report.employees.filter((e) => e.outings > 0);

  const query = (d: typeof draft) => {
    const p = new URLSearchParams({ date: d.date });
    if (d.employeeId) p.set("employee", d.employeeId);
    if (d.departmentId) p.set("department", d.departmentId);
    if (d.locationId) p.set("location", d.locationId);
    return p.toString();
  };
  const go = (d: typeof draft) => startNav(() => router.push(`/daily-report?${query(d)}`));
  const shiftDate = (n: number) => {
    const next = addDaysToKey(draft.date, n);
    if (next > today) return;
    const d = { ...draft, date: next };
    setDraft(d);
    go(d);
  };

  const setOption = (k: keyof ReportOptions, v: boolean) => {
    const next = { ...options, [k]: v };
    setOptions(next);
    if (!isAdmin) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const r = await saveReportOptions(next);
      if (!r.ok) toast.error(r.error);
    }, 600);
  };

  const exportUrl = (format: "pdf" | "xlsx") => `/api/reports/daily?${query({ date, ...filters })}&format=${format}`;

  return (
    <>
      <div className="space-y-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-[28px]">Daily IN - OUT Report</h2>
          <p className="mt-1 text-sm text-muted-foreground">View and generate employee-wise daily movement report. Copy to WhatsApp, download or print.</p>
        </div>

        {/* Filters */}
        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_220px]">
          <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-3 xl:grid-cols-[minmax(340px,1.4fr)_repeat(3,minmax(0,1fr))]">
            <div className="space-y-1.5 sm:col-span-3 xl:col-span-1">
              <label htmlFor="report-date" className="block text-sm font-semibold">
                Select Date <span className="text-destructive">*</span>
              </label>
              <div className="flex gap-2">
                <div className="relative min-w-[150px] flex-1">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="report-date"
                    type="date"
                    value={draft.date}
                    max={today}
                    onChange={(e) => e.target.value && setDraft({ ...draft, date: e.target.value })}
                    className="tabular h-10 w-full rounded-lg border bg-background pl-9 pr-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  />
                </div>
                <Button variant="outline" size="icon-lg" className="size-10" onClick={() => shiftDate(-1)} aria-label="Previous day">
                  <ChevronLeft />
                </Button>
                <Button variant="outline" size="icon-lg" className="size-10" onClick={() => shiftDate(1)} disabled={draft.date >= today} aria-label="Next day">
                  <ChevronRight />
                </Button>
                <Button
                  className="h-10 px-4"
                  onClick={() => {
                    const d = { ...draft, date: today };
                    setDraft(d);
                    go(d);
                  }}
                >
                  Today
                </Button>
              </div>
            </div>
            <FilterSelect label="Employee" all="All Employees" value={draft.employeeId} onChange={(v) => setDraft({ ...draft, employeeId: v })} options={filterOptions.employees} />
            <FilterSelect label="Department" all="All Departments" value={draft.departmentId} onChange={(v) => setDraft({ ...draft, departmentId: v })} options={filterOptions.departments} />
            <FilterSelect label="Location" all="All Locations" value={draft.locationId} onChange={(v) => setDraft({ ...draft, locationId: v })} options={filterOptions.locations} />
          </div>
          <div className="flex items-stretch rounded-xl border bg-card p-3">
            <Button className="h-12 w-full text-base 2xl:h-auto 2xl:min-h-14" onClick={() => go(draft)} disabled={navigating}>
              {navigating ? <Loader2 className="animate-spin" /> : <FileText className="size-5" />}
              Generate Report
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className={cn("grid grid-cols-2 gap-3 transition-opacity md:grid-cols-3 2xl:grid-cols-5", navigating && "opacity-60")}>
          <StatCard tinted tone="blue" icon={Users} label="Employees Out" value={s.employeesOut} sub="with movement" />
          <StatCard tinted tone="green" icon={ArrowLeftRight} label="Total Outings" value={s.outings} sub="total entries" />
          <StatCard tinted tone="green" icon={CircleCheck} label="Completed" value={s.completed} sub="with IN time" />
          <StatCard tinted tone="orange" icon={Clock3} label="Pending IN" value={s.pending} sub="currently outside" />
          <StatCard tinted tone="purple" icon={Timer} label="Total Outside Time" value={formatDuration(s.totalMinutes)} sub="completed entries" className="col-span-2 md:col-span-1" />
        </div>

        {/* Preview + details */}
        <div className={cn("grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]", navigating && "opacity-60")}>
          <section className="flex flex-col rounded-2xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold">Report Preview (WhatsApp Format)</h3>
              <Button
                className="h-10 bg-emerald-600 px-4 text-white hover:bg-emerald-700"
                onClick={async () => {
                  if (await copyText(text)) toast.success("Report copied. Paste it in WhatsApp.");
                  else toast.error("Could not copy. Select the text and copy manually.");
                }}
              >
                <Copy /> Copy Report
              </Button>
            </div>
            <div className="max-h-[640px] min-h-[300px] flex-1 overflow-y-auto rounded-xl border bg-muted/30 p-4">
              <WhatsAppPreview text={text} />
            </div>
          </section>

          <section className="h-fit rounded-2xl border bg-card p-4">
            <h3 className="mb-1 text-lg font-semibold">Report Options</h3>
            <p className="mb-3 text-sm text-muted-foreground">Choose what appears in the WhatsApp report.{isAdmin ? " Saved as default for everyone." : ""}</p>
            <div className="divide-y rounded-xl border">
              {OPTION_ROWS.map((o) => (
                <label key={o.key} className="flex cursor-pointer items-center justify-between gap-3 px-3 py-3">
                  <span>
                    <span className="block text-sm font-medium">{o.label}</span>
                    <span className="block text-xs text-muted-foreground">{o.hint}</span>
                  </span>
                  <Switch checked={options[o.key]} onCheckedChange={(v) => setOption(o.key, v)} />
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" className="h-11 border-red-300 px-5 text-red-600 hover:bg-red-50 hover:text-red-700">
            <a href={exportUrl("pdf")}>
              <FileText /> Download PDF
            </a>
          </Button>
          <Button asChild variant="outline" className="h-11 border-emerald-300 px-5 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800">
            <a href={exportUrl("xlsx")}>
              <FileSpreadsheet /> Download Excel
            </a>
          </Button>
          <Button variant="outline" className="h-11 px-5" onClick={() => window.print()}>
            <Printer /> Print Report
          </Button>
          <Button asChild variant="outline" className="h-11 border-primary/40 px-5 text-primary hover:bg-blue-50 sm:ml-auto">
            <Link href={`/new-entry?date=${date}`}>
              <ListChecks /> View All Entries
            </Link>
          </Button>
        </div>
      </div>

      {/* Print layout */}
      <div className="hidden text-black print:block">
        <div className="mb-4 flex items-end justify-between border-b-2 border-black pb-2">
          <div>
            <div className="text-xl font-bold">DDSR GROUP</div>
            <div className="text-sm">{options.title}</div>
          </div>
          <div className="text-lg font-semibold">{formatDateKey(date)}</div>
        </div>
        <p className="mb-4 text-sm">
          Employees Out: {s.employeesOut} · Total Outings: {s.outings} · Completed: {s.completed} · Pending IN: {s.pending} · Total Outside Time: {formatDuration(s.totalMinutes)}
        </p>
        {withMovement.map((e) => (
          <div key={e.employeeId} className="mb-4 break-inside-avoid">
            <div className="mb-1 font-semibold">
              {e.name} — Total {formatDurationReport(e.totalMinutes)} ({e.outings} {e.outings === 1 ? "outing" : "outings"})
            </div>
            <EntriesTable emp={e} />
          </div>
        ))}
        {withMovement.length === 0 && <p>No movement entries found for this date.</p>}
      </div>
    </>
  );
}
