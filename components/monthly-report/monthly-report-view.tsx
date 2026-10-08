"use client";

import {
  ArrowLeftRight,
  CalendarRange,
  Clock3,
  FileDown,
  FileSpreadsheet,
  FileText,
  Gauge,
  Loader2,
  Printer,
  Search,
  Timer,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateKey, formatDateTime } from "@/lib/date-utils";
import { formatDuration } from "@/lib/duration-utils";
import type { MonthlyReport } from "@/lib/queries/monthly";
import { cn } from "@/lib/utils";
import { OutingsPerDayChart } from "./monthly-chart";

type Tab = "employee" | "day" | "department" | "location" | "user";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const TABS: { id: Tab; label: string }[] = [
  { id: "employee", label: "Employee Wise" },
  { id: "day", label: "Day Wise" },
  { id: "department", label: "Department Wise" },
  { id: "location", label: "Location Wise" },
  { id: "user", label: "Entered By" },
];

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("h-11 whitespace-nowrap px-3 text-left font-semibold first:rounded-l-lg last:rounded-r-lg", className)}>{children}</th>;
}
function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("h-11 whitespace-nowrap px-3", className)}>{children}</td>;
}

export function MonthlyReportView({ report, years, maxMonthForYear }: { report: MonthlyReport; years: number[]; maxMonthForYear: Record<number, number> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [year, setYear] = useState(report.year);
  const [month, setMonth] = useState(report.month);
  const [tab, setTab] = useState<Tab>("employee");
  const [q, setQ] = useState("");
  const s = report.summary;
  const label = `${MONTHS[report.month - 1]} ${report.year}`;
  const qs = `year=${report.year}&month=${report.month}`;

  const generate = (y = year, m = month) => start(() => router.push(`/monthly-report?year=${y}&month=${m}`));

  const chart = useMemo(() => {
    const days = new Date(Date.UTC(report.year, report.month, 0)).getUTCDate();
    const byDate = new Map(report.days.map((d) => [d.date, d]));
    return Array.from({ length: days }, (_, i) => {
      const key = `${report.year}-${String(report.month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
      const d = byDate.get(key);
      return { label: String(i + 1).padStart(2, "0"), outings: d?.outings ?? 0, minutes: d?.totalMinutes ?? 0 };
    });
  }, [report]);

  const needle = q.trim().toLowerCase();
  const match = (...vals: (string | null)[]) => !needle || vals.some((v) => v?.toLowerCase().includes(needle));
  const empty = s.outings === 0;

  return (
    <>
      <div className="space-y-4 print:hidden">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-[28px]">Monthly Report</h2>
            <p className="mt-1 text-sm text-muted-foreground">Employee, day, department and location wise movement statistics for the month.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
          <div className="space-y-1.5">
            <div className="text-sm font-semibold">Month</div>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="h-10! w-[160px]" aria-label="Month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)} disabled={i + 1 > (maxMonthForYear[year] ?? 12)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <div className="text-sm font-semibold">Year</div>
            <Select
              value={String(year)}
              onValueChange={(v) => {
                const y = Number(v);
                setYear(y);
                setMonth((m) => Math.min(m, maxMonthForYear[y] ?? 12));
              }}
            >
              <SelectTrigger className="h-10! w-[120px]" aria-label="Year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="h-10 px-6" onClick={() => generate()} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <CalendarRange />} Generate Report
          </Button>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button asChild variant="outline" className="h-10 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700">
              <a href={`/api/reports/monthly?${qs}&format=pdf`}>
                <FileText /> PDF
              </a>
            </Button>
            <Button asChild variant="outline" className="h-10 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800">
              <a href={`/api/reports/monthly?${qs}&format=xlsx`}>
                <FileSpreadsheet /> Excel
              </a>
            </Button>
            <Button asChild variant="outline" className="h-10">
              <a href={`/api/reports/monthly?${qs}&format=csv&tab=${tab}`}>
                <FileDown /> CSV
              </a>
            </Button>
            <Button variant="outline" className="h-10" onClick={() => window.print()}>
              <Printer /> Print
            </Button>
          </div>
        </div>

        <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-5", pending && "opacity-60")}>
          <StatCard tinted tone="blue" icon={ArrowLeftRight} label="Total Outings" value={s.outings} sub={`${s.activeDays} active days`} />
          <StatCard tinted tone="green" icon={Users} label="Employees Out" value={s.employeesOut} sub="had movement" />
          <StatCard tinted tone="purple" icon={Timer} label="Total Outside Time" value={formatDuration(s.totalMinutes)} sub="completed entries" />
          <StatCard tinted tone="slate" icon={Gauge} label="Average / Outing" value={formatDuration(s.avgMinutes)} sub="completed entries" />
          <StatCard tinted tone="orange" icon={Clock3} label="Pending IN" value={s.pending} sub="IN time missing" className="col-span-2 md:col-span-1" />
        </div>

        <section className={cn("rounded-2xl border bg-card p-4", pending && "opacity-60")}>
          <h3 className="mb-2 text-lg font-semibold">Outings per Day — {label}</h3>
          {empty ? <p className="py-12 text-center text-sm text-muted-foreground">No movement data available for this month.</p> : <OutingsPerDayChart data={chart} />}
        </section>

        <section className={cn("rounded-2xl border bg-card p-4", pending && "opacity-60")}>
          <div className="flex flex-col gap-3 border-b md:flex-row md:items-end md:justify-between">
            <div role="tablist" className="flex gap-1 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  type="button"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "relative h-11 whitespace-nowrap px-4 text-sm font-medium",
                    tab === t.id ? "text-primary after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-primary" : "text-foreground/70 hover:text-foreground",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {(tab === "employee" || tab === "location" || tab === "department" || tab === "user") && (
              <div className="relative mb-2 md:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="h-9 pl-9" aria-label="Search table" />
              </div>
            )}
          </div>

          <div className="mt-3 overflow-x-auto">
            {empty ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No movement data available for this month.</p>
            ) : (
              <table className="w-full min-w-[720px] text-sm">
                {tab === "employee" && (
                  <>
                    <thead>
                      <tr className="bg-muted/70">
                        <Th className="w-16">Sr. No.</Th>
                        <Th>Employee</Th>
                        <Th>Department</Th>
                        <Th className="text-right">Working Days</Th>
                        <Th className="text-right">Total Outings</Th>
                        <Th className="text-right">Total Outside Time</Th>
                        <Th className="text-right">Average / Outing</Th>
                        <Th className="text-right">Longest Outing</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.employees
                        .filter((e) => match(e.name, e.department, e.code))
                        .map((e, i) => (
                          <tr key={e.employeeId} className="border-b">
                            <Td className="tabular">{i + 1}</Td>
                            <Td className="font-medium">{e.name}</Td>
                            <Td>{e.department ?? "—"}</Td>
                            <Td className="tabular text-right">{e.workingDays}</Td>
                            <Td className="tabular text-right">{e.outings}</Td>
                            <Td className="tabular text-right font-medium">{formatDuration(e.totalMinutes)}</Td>
                            <Td className="tabular text-right">{formatDuration(e.avgMinutes)}</Td>
                            <Td className="tabular text-right">{formatDuration(e.longestMinutes)}</Td>
                          </tr>
                        ))}
                    </tbody>
                  </>
                )}
                {tab === "day" && (
                  <>
                    <thead>
                      <tr className="bg-muted/70">
                        <Th>Date</Th>
                        <Th className="text-right">Employees Out</Th>
                        <Th className="text-right">Total Outings</Th>
                        <Th className="text-right">Completed</Th>
                        <Th className="text-right">Pending IN</Th>
                        <Th className="text-right">Total Outside Time</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.days.map((d) => (
                        <tr key={d.date} className="border-b">
                          <Td className="tabular font-medium">
                            <a href={`/daily-report?date=${d.date}`} className="hover:text-primary hover:underline">
                              {formatDateKey(d.date)}
                            </a>
                          </Td>
                          <Td className="tabular text-right">{d.employeesOut}</Td>
                          <Td className="tabular text-right">{d.outings}</Td>
                          <Td className="tabular text-right">{d.completed}</Td>
                          <Td className={cn("tabular text-right", d.pending && "font-semibold text-amber-600")}>{d.pending}</Td>
                          <Td className="tabular text-right font-medium">{formatDuration(d.totalMinutes)}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}
                {tab === "department" && (
                  <>
                    <thead>
                      <tr className="bg-muted/70">
                        <Th>Department</Th>
                        <Th className="text-right">Employees</Th>
                        <Th className="text-right">Total Outings</Th>
                        <Th className="text-right">Total Outside Time</Th>
                        <Th className="text-right">Average Duration</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.departments
                        .filter((d) => match(d.department))
                        .map((d) => (
                          <tr key={d.department} className="border-b">
                            <Td className="font-medium">{d.department}</Td>
                            <Td className="tabular text-right">{d.employees}</Td>
                            <Td className="tabular text-right">{d.outings}</Td>
                            <Td className="tabular text-right font-medium">{formatDuration(d.totalMinutes)}</Td>
                            <Td className="tabular text-right">{formatDuration(d.avgMinutes)}</Td>
                          </tr>
                        ))}
                    </tbody>
                  </>
                )}
                {tab === "user" && (
                  <>
                    <thead>
                      <tr className="bg-muted/70">
                        <Th className="w-12">#</Th>
                        <Th>User</Th>
                        <Th>Role</Th>
                        <Th className="text-right">Entries Added</Th>
                        <Th className="text-right">Mark IN</Th>
                        <Th className="text-right">Edits</Th>
                        <Th className="text-right">Deleted</Th>
                        <Th>Last Activity</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.users.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-muted-foreground">
                            No entries were made this month.
                          </td>
                        </tr>
                      )}
                      {report.users
                        .filter((u) => match(u.name))
                        .map((u, i) => (
                          <tr key={u.userId} className="border-b">
                            <Td className="tabular">{i + 1}</Td>
                            <Td className="font-medium">{u.name}</Td>
                            <Td>
                              <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", u.role === "ADMIN" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-700")}>
                                {u.role === "ADMIN" ? "Admin" : "Staff"}
                              </span>
                            </Td>
                            <Td className="tabular text-right font-medium">{u.added}</Td>
                            <Td className="tabular text-right">{u.markedIn}</Td>
                            <Td className="tabular text-right">{u.edited}</Td>
                            <Td className={cn("tabular text-right", u.deleted > 0 && "font-semibold text-red-600")}>{u.deleted}</Td>
                            <Td className="tabular">{u.lastActivity ? formatDateTime(new Date(u.lastActivity)) : "-"}</Td>
                          </tr>
                        ))}
                    </tbody>
                  </>
                )}
                {tab === "location" && (
                  <>
                    <thead>
                      <tr className="bg-muted/70">
                        <Th className="w-12">#</Th>
                        <Th>Location</Th>
                        <Th className="text-right">Visits</Th>
                        <Th className="text-right">Employees</Th>
                        <Th className="text-right">Total Time</Th>
                        <Th className="text-right">Average / Visit</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.locations
                        .filter((l) => match(l.location))
                        .map((l, i) => (
                          <tr key={l.location} className="border-b">
                            <Td className="tabular">{i + 1}</Td>
                            <Td className="font-medium">{l.location}</Td>
                            <Td className="tabular text-right">{l.visits}</Td>
                            <Td className="tabular text-right">{l.employees}</Td>
                            <Td className="tabular text-right font-medium">{formatDuration(l.totalMinutes)}</Td>
                            <Td className="tabular text-right">{formatDuration(l.avgMinutes)}</Td>
                          </tr>
                        ))}
                    </tbody>
                  </>
                )}
              </table>
            )}
          </div>
        </section>
      </div>

      {/* Print layout: all four tables */}
      <div className="hidden text-black print:block">
        <div className="mb-4 flex items-end justify-between border-b-2 border-black pb-2">
          <div>
            <div className="text-xl font-bold">DDSR GROUP</div>
            <div className="text-sm">Monthly Movement Report</div>
          </div>
          <div className="text-lg font-semibold">{label}</div>
        </div>
        <p className="mb-4 text-sm">
          Total Outings: {s.outings} · Employees Out: {s.employeesOut} · Total Outside Time: {formatDuration(s.totalMinutes)} · Average / Outing: {formatDuration(s.avgMinutes)} · Pending IN: {s.pending}
        </p>
        <table className="mb-6 w-full border-collapse text-xs [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left">
          <thead>
            <tr>
              <th>Sr.</th>
              <th>Employee</th>
              <th>Working Days</th>
              <th>Outings</th>
              <th>Outside Time</th>
              <th>Average</th>
              <th>Longest</th>
            </tr>
          </thead>
          <tbody>
            {report.employees.map((e, i) => (
              <tr key={e.employeeId}>
                <td>{i + 1}</td>
                <td>{e.name}</td>
                <td>{e.workingDays}</td>
                <td>{e.outings}</td>
                <td>{formatDuration(e.totalMinutes)}</td>
                <td>{formatDuration(e.avgMinutes)}</td>
                <td>{formatDuration(e.longestMinutes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="w-full border-collapse text-xs [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left">
          <thead>
            <tr>
              <th>Date</th>
              <th>Employees Out</th>
              <th>Outings</th>
              <th>Completed</th>
              <th>Pending IN</th>
              <th>Outside Time</th>
            </tr>
          </thead>
          <tbody>
            {report.days.map((d) => (
              <tr key={d.date}>
                <td>{formatDateKey(d.date)}</td>
                <td>{d.employeesOut}</td>
                <td>{d.outings}</td>
                <td>{d.completed}</td>
                <td>{d.pending}</td>
                <td>{formatDuration(d.totalMinutes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3 className="mb-1 mt-6 font-semibold">Entered By</h3>
        <table className="w-full border-collapse text-xs [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Entries Added</th>
              <th>Mark IN</th>
              <th>Edits</th>
              <th>Deleted</th>
            </tr>
          </thead>
          <tbody>
            {report.users.map((u) => (
              <tr key={u.userId}>
                <td>{u.name}</td>
                <td>{u.role === "ADMIN" ? "Admin" : "Staff"}</td>
                <td>{u.added}</td>
                <td>{u.markedIn}</td>
                <td>{u.edited}</td>
                <td>{u.deleted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
