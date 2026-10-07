"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDuration } from "@/lib/duration-utils";

export type MonthDay = { label: string; outings: number; minutes: number };

/** Single series → no legend; the panel title names it. */
export function OutingsPerDayChart({ data }: { data: MonthDay[] }) {
  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -22, bottom: 0 }} barCategoryGap="20%">
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "rgba(148,163,184,0.12)" }}
            content={({ active, payload, label }) => {
              const p = payload?.[0]?.payload as MonthDay | undefined;
              if (!active || !p) return null;
              return (
                <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                  <div className="mb-1 font-semibold">{label}</div>
                  <div className="text-muted-foreground">
                    Outings <span className="tabular ml-3 font-medium text-foreground">{p.outings}</span>
                  </div>
                  <div className="text-muted-foreground">
                    Outside time <span className="tabular ml-3 font-medium text-foreground">{formatDuration(p.minutes)}</span>
                  </div>
                </div>
              );
            }}
          />
          <Bar isAnimationActive={false} dataKey="outings" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
