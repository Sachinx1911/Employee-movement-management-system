"use client";

import { History, KeyRound, Loader2 } from "lucide-react";
import Link from "next/link";
import { Fragment, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeMyPassword } from "@/lib/actions/settings";
import { formatDateTime } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { SectionCard } from "./section-card";

export type AuditRow = { id: string; at: string; user: string; entityType: string; action: string; summary: string | null; changes: unknown };

const ACTION_STYLE: Record<string, string> = {
  CREATE: "bg-emerald-50 text-emerald-700",
  UPDATE: "bg-blue-50 text-blue-700",
  MARK_IN: "bg-sky-50 text-sky-700",
  VOID: "bg-red-50 text-red-600",
  DELETE: "bg-red-50 text-red-600",
  DEACTIVATE: "bg-amber-50 text-amber-700",
  ACTIVATE: "bg-emerald-50 text-emerald-700",
  LOGIN: "bg-slate-100 text-slate-600",
};

function ChangeDetails({ changes }: { changes: unknown }) {
  if (!changes || typeof changes !== "object") return null;
  const entries = Object.entries(changes as Record<string, unknown>).filter(
    ([, v]) => v && typeof v === "object" && "from" in (v as object) && "to" in (v as object),
  ) as [string, { from: unknown; to: unknown }][];
  if (!entries.length) return null;
  const show = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));
  return (
    <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
      {entries.slice(0, 8).map(([k, v]) => (
        <div key={k} className="truncate">
          <span className="font-medium text-foreground/80">{k}</span>: {show(v.from)} → {show(v.to)}
        </div>
      ))}
    </div>
  );
}

export function SecurityPanel({ audit, page, total, pageSize }: { audit: AuditRow[]; page: number; total: number; pageSize: number }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<string | null>(null);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <SectionCard icon={KeyRound} title="Change Password" subtitle="Update the password for your own account.">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (next !== confirm) {
              toast.error("New passwords do not match.");
              return;
            }
            start(async () => {
              const r = await changeMyPassword(current, next);
              if (r.ok) {
                toast.success(r.message);
                // All sessions (including this one) ended; sign in again.
                // Full navigation: /session-ended is a route handler that clears the cookie.
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                setTimeout(() => window.location.assign("/session-ended"), 1200);
              } else toast.error(r.error);
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="pw-current">Current Password</Label>
            <Input id="pw-current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw-new">New Password</Label>
            <Input id="pw-new" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" minLength={10} required />
            <p className="text-xs text-muted-foreground">At least 10 characters, with letters and numbers.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw-confirm">Confirm New Password</Label>
            <Input id="pw-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" minLength={10} required />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />} Change Password
          </Button>
        </form>
      </SectionCard>

      <SectionCard icon={History} title="Audit Log" subtitle="Every create, edit, mark IN, delete and login — who did it and when.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-[13px]">
            <thead>
              <tr className="bg-muted/70 text-left [&>th]:h-10 [&>th]:px-3 [&>th]:font-semibold">
                <th className="rounded-l-lg">Date &amp; Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Record</th>
                <th className="rounded-r-lg">Details</th>
              </tr>
            </thead>
            <tbody>
              {audit.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground">
                    No activity recorded yet.
                  </td>
                </tr>
              )}
              {audit.map((a) => (
                <Fragment key={a.id}>
                  <tr className="cursor-pointer border-b align-top hover:bg-muted/30 [&>td]:px-3 [&>td]:py-2.5" onClick={() => setOpen(open === a.id ? null : a.id)}>
                    <td className="tabular whitespace-nowrap">{formatDateTime(new Date(a.at))}</td>
                    <td className="whitespace-nowrap">{a.user}</td>
                    <td>
                      <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold", ACTION_STYLE[a.action] ?? "bg-muted text-foreground/70")}>{a.action.replace("_", " ")}</span>
                    </td>
                    <td className="whitespace-nowrap">{a.entityType}</td>
                    <td>
                      {a.summary}
                      {open === a.id && <ChangeDetails changes={a.changes} />}
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {pages} · {total} records
          </span>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className={cn(page <= 1 && "pointer-events-none opacity-50")}>
              <Link href={`/settings?tab=security&page=${page - 1}`}>Previous</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className={cn(page >= pages && "pointer-events-none opacity-50")}>
              <Link href={`/settings?tab=security&page=${page + 1}`}>Next</Link>
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
