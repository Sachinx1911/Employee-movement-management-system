import { ArrowUp, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tone = "blue" | "green" | "orange" | "purple" | "red" | "slate";

const TONES: Record<Tone, { tile: string; tint: string; sub: string }> = {
  blue: { tile: "bg-blue-100 text-blue-600", tint: "bg-blue-50/60", sub: "text-muted-foreground" },
  green: { tile: "bg-emerald-100 text-emerald-600", tint: "bg-emerald-50/60", sub: "text-muted-foreground" },
  orange: { tile: "bg-amber-100 text-amber-500", tint: "bg-amber-50/70", sub: "text-muted-foreground" },
  purple: { tile: "bg-violet-100 text-violet-600", tint: "bg-violet-50/60", sub: "text-muted-foreground" },
  red: { tile: "bg-red-100 text-red-600", tint: "bg-red-50/60", sub: "text-red-600" },
  slate: { tile: "bg-slate-100 text-slate-600", tint: "bg-slate-50", sub: "text-muted-foreground" },
};

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "blue",
  tinted = false,
  delta,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  tinted?: boolean;
  /** Small "+N" change shown next to the value (0 shows "0" muted). */
  delta?: number;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <div className={cn("flex items-center gap-4 rounded-xl border bg-card p-4", tinted && t.tint, className)}>
      <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", t.tile)}>
        <Icon className="size-6" strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium text-foreground/80">{label}</div>
        <div className="flex items-baseline gap-2">
          <span className="tabular text-2xl font-bold leading-tight tracking-tight">{value}</span>
          {delta !== undefined && (
            <span className={cn("tabular flex items-center text-xs font-semibold", delta > 0 ? "text-emerald-600" : "text-muted-foreground")}>
              {delta > 0 && <ArrowUp className="size-3" strokeWidth={3} />}
              {delta > 0 ? `+${delta}` : delta}
            </span>
          )}
        </div>
        {sub && <div className={cn("truncate text-xs", t.sub)}>{sub}</div>}
      </div>
    </div>
  );
}
