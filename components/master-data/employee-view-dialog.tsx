"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { NameAvatar, StatusBadge } from "@/components/shared/badges";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getEmployeeDetails, type EmployeeDetails } from "@/lib/actions/employees";
import { formatDateKey, formatTime } from "@/lib/date-utils";
import { formatDuration } from "@/lib/duration-utils";
import type { EmployeeRow } from "@/lib/queries/masters";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  );
}

export function EmployeeViewDialog({ employee, onOpenChange }: { employee: EmployeeRow | null; onOpenChange: (open: boolean) => void }) {
  const [details, setDetails] = useState<{ id: string; data: EmployeeDetails | null; error?: string } | null>(null);

  useEffect(() => {
    if (!employee) return;
    let cancelled = false;
    getEmployeeDetails(employee.id).then((r) => {
      if (!cancelled) setDetails({ id: employee.id, data: r.ok ? r.data! : null, error: r.ok ? undefined : r.error });
    });
    return () => {
      cancelled = true;
    };
  }, [employee]);

  const current = employee && details?.id === employee.id ? details : null;

  return (
    <Dialog open={!!employee} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {employee && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <NameAvatar name={employee.name} className="size-11 text-base" />
                <div className="text-left">
                  <DialogTitle className="text-lg">{employee.name}</DialogTitle>
                  <DialogDescription>
                    {employee.code} · {employee.designation || "No designation"}
                  </DialogDescription>
                </div>
                <StatusBadge kind={employee.active ? "active" : "inactive"} className="ml-auto" />
              </div>
            </DialogHeader>

            <div className="divide-y rounded-lg border px-3">
              <Row label="Department" value={employee.departmentName} />
              <Row label="Mobile" value={employee.mobile} />
              <Row label="Email" value={employee.email} />
              <Row label="Date of Joining" value={employee.joiningDate ? formatDateKey(employee.joiningDate) : null} />
              {employee.address && <Row label="Address" value={employee.address} />}
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Movement summary</p>
              {!current ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Loading…
                </div>
              ) : current.error ? (
                <p className="text-sm text-destructive">{current.error}</p>
              ) : (
                current.data && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-muted p-2">
                        <div className="tabular text-lg font-bold">{current.data.monthOutings}</div>
                        <div className="text-[11px] text-muted-foreground">Outings this month</div>
                      </div>
                      <div className="rounded-lg bg-muted p-2">
                        <div className="tabular text-lg font-bold">{formatDuration(current.data.monthMinutes)}</div>
                        <div className="text-[11px] text-muted-foreground">Outside this month</div>
                      </div>
                      <div className="rounded-lg bg-muted p-2">
                        <div className="tabular text-lg font-bold">{current.data.totalOutings}</div>
                        <div className="text-[11px] text-muted-foreground">All-time outings</div>
                      </div>
                    </div>
                    {current.data.currentlyOutside ? (
                      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                        Currently outside at <b>{current.data.currentlyOutside.location}</b> since{" "}
                        {formatTime(new Date(current.data.currentlyOutside.outTime))}
                      </p>
                    ) : current.data.lastMovement ? (
                      <p className="text-sm text-muted-foreground">
                        Last outing: {current.data.lastMovement.location} on {formatDateKey(current.data.lastMovement.date)}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">No movement records yet.</p>
                    )}
                  </div>
                )
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
