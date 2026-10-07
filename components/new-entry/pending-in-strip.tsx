"use client";

import { Clock3, LogIn, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { entrySuccess } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { markIn } from "@/lib/actions/movements";
import { formatDateKey, formatTime, todayKey } from "@/lib/date-utils";
import { formatDurationBadge } from "@/lib/duration-utils";
import type { PendingIn } from "@/lib/queries/movements";
import { cn } from "@/lib/utils";

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function PendingCard({ item, now }: { item: PendingIn; now: number }) {
  const [pending, start] = useTransition();
  const out = new Date(item.outTime);
  const minutes = Math.max(0, Math.floor((now - out.getTime()) / 60_000));
  const older = item.date !== todayKey();
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border bg-card p-3", older && "border-amber-300 bg-amber-50/60")}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{item.employee}</span>
          {older && <span className="rounded bg-amber-100 px-1.5 text-[11px] font-medium text-amber-700">{formatDateKey(item.date)}</span>}
        </div>
        <div className="truncate text-sm text-muted-foreground">{item.location}</div>
        <div className="mt-0.5 flex items-center gap-1 text-xs text-amber-700">
          <Clock3 className="size-3" /> OUT {formatTime(out)} · {formatDurationBadge(minutes)}
        </div>
      </div>
      <Button
        className="h-11 shrink-0 px-4"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await markIn(item.id);
            if (r.ok) entrySuccess(r.message);
            else toast.error(r.error);
          })
        }
      >
        {pending ? <Loader2 className="animate-spin" /> : <LogIn />}
        MARK IN
      </Button>
    </div>
  );
}

/** Everyone still outside, with one-tap MARK IN (mobile-first). */
export function PendingInStrip({ items, className }: { items: PendingIn[]; className?: string }) {
  const now = useNow();
  return (
    <section className={cn("rounded-2xl border bg-card p-4", className)} aria-labelledby="pending-in-title">
      <div className="mb-3 flex items-center justify-between">
        <h3 id="pending-in-title" className="text-base font-semibold">
          Currently Outside
        </h3>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">{items.length} Pending IN</span>
      </div>
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No employees are currently outside.</p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <PendingCard key={item.id} item={item} now={now} />
          ))}
        </div>
      )}
    </section>
  );
}
