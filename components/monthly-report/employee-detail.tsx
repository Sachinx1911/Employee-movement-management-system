"use client";

import { Coffee, FileDown, Printer, User, UserRound } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateKey, formatTime } from "@/lib/date-utils";
import { formatDuration, formatDurationReport } from "@/lib/duration-utils";
import { purposeKind, PURPOSE_KIND_LABEL, type PurposeKind } from "@/lib/purpose-highlight";
import type { EmployeeMonthRow, MonthEntry } from "@/lib/queries/monthly";
import { cn } from "@/lib/utils";

// Light highlight colours: soft background + thin left border, normal text.
const ROW_STYLE: Record<PurposeKind, string> = {
  lunch: "bg-orange-50 [&>td:first-child]:border-l-4 [&>td:first-child]:border-l-orange-300",
  personal: "bg-violet-50 [&>td:first-child]:border-l-4 [&>td:first-child]:border-l-violet-300",
};
const CHIP_STYLE: Record<PurposeKind, string> = {
  lunch: "bg-orange-100 text-orange-800",
  personal: "bg-violet-100 text-violet-800",
};

export function EmployeeDetail({
  employees,
  entries,
  employeeId,
  onEmployeeChange,
  exportHref,
}: {
  employees: EmployeeMonthRow[];
  entries: MonthEntry[];
  employeeId: string;
  onEmployeeChange: (id: string) => void;
  exportHref: string;
}) {
  const emp = employees.find((e) => e.employeeId === employeeId) ?? null;
  const rows = useMemo(() => entries.filter((e) => e.employeeId === employeeId), [entries, employeeId]);

  const totals = useMemo(() => {
    const t = { all: 0, lunch: 0, personal: 0, lunchCount: 0, personalCount: 0 };
    for (const r of rows) {
      const m = r.durationMinutes ?? 0;
      t.all += m;
      const k = purposeKind(r.purpose);
      if (k === "lunch") {
        t.lunch += m;
        t.lunchCount++;
      } else if (k === "personal") {
        t.personal += m;
        t.personalCount++;
      }
    }
    return t;
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <div className="text-sm font-semibold">Employee</div>
          <Select value={employeeId || undefined} onValueChange={onEmployeeChange}>
            <SelectTrigger className="h-10! w-[260px]" aria-label="Select employee">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.employeeId} value={e.employeeId}>
                  {e.name}
                  {e.code ? ` · ${e.code}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {emp && (
          <>
            <Button asChild variant="outline" className="h-10">
              <a href={exportHref}>
                <FileDown /> CSV
              </a>
            </Button>
            <Button variant="outline" className="h-10" onClick={() => window.print()}>
              <Printer /> Print
            </Button>
          </>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm border-l-4 border-l-orange-300 bg-orange-50" /> Lunch
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm border-l-4 border-l-violet-300 bg-violet-50" /> Personal Work
          </span>
        </div>
      </div>

      {!emp ? (
        <div className="flex flex-col items-center gap-2 py-14 text-center text-sm text-muted-foreground">
          <UserRound className="size-8" />
          Select an employee to see every entry for this month.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border bg-card p-3">
              <div className="text-xs text-muted-foreground">Total Outings</div>
              <div className="tabular text-xl font-bold">{rows.length}</div>
              <div className="text-xs text-muted-foreground">{emp.workingDays} working days</div>
            </div>
            <div className="rounded-xl border bg-card p-3">
              <div className="text-xs text-muted-foreground">Total Out Time</div>
              <div className="tabular text-xl font-bold">{formatDuration(totals.all)}</div>
              <div className="text-xs text-muted-foreground">completed entries</div>
            </div>
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
              <div className="flex items-center gap-1 text-xs text-orange-800">
                <Coffee className="size-3.5" /> Lunch
              </div>
              <div className="tabular text-xl font-bold">{formatDuration(totals.lunch)}</div>
              <div className="text-xs text-orange-800/80">{totals.lunchCount} times</div>
            </div>
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
              <div className="flex items-center gap-1 text-xs text-violet-800">
                <User className="size-3.5" /> Personal Work
              </div>
              <div className="tabular text-xl font-bold">{formatDuration(totals.personal)}</div>
              <div className="text-xs text-violet-800/80">{totals.personalCount} times</div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="bg-muted/70 text-left [&>th]:h-11 [&>th]:whitespace-nowrap [&>th]:px-3 [&>th]:font-semibold">
                  <th className="w-12">#</th>
                  <th>Date</th>
                  <th>OUT Time</th>
                  <th>IN Time</th>
                  <th>Location</th>
                  <th>Reason (Purpose)</th>
                  <th className="text-right">Total Out Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground">
                      No entries for this employee in this month.
                    </td>
                  </tr>
                )}
                {rows.map((r, i) => {
                  const k = purposeKind(r.purpose);
                  return (
                    <tr key={r.id} className={cn("border-b last:border-b-0 [&>td]:h-11 [&>td]:whitespace-nowrap [&>td]:px-3", k && ROW_STYLE[k])}>
                      <td className="tabular">{i + 1}</td>
                      <td className="tabular">{formatDateKey(r.date)}</td>
                      <td className="tabular">{formatTime(new Date(r.outTime))}</td>
                      <td className="tabular">{r.inTime ? formatTime(new Date(r.inTime)) : <span className="text-amber-600">Pending</span>}</td>
                      <td className="font-medium">{r.location}</td>
                      <td>
                        {k ? (
                          <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", CHIP_STYLE[k])}>{r.purpose ?? PURPOSE_KIND_LABEL[k]}</span>
                        ) : (
                          (r.purpose ?? "-")
                        )}
                      </td>
                      <td className="tabular text-right font-medium">{r.inTime ? formatDurationReport(r.durationMinutes) : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="bg-muted/50 font-semibold [&>td]:h-11 [&>td]:px-3">
                    <td colSpan={6}>Total</td>
                    <td className="tabular text-right">{formatDurationReport(totals.all)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </div>
  );
}
