"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DayPoint, MonthPoint } from "@/lib/queries/dashboard";

// Validated pair (scripts/validate_palette.js): blue/green CVD ΔE 35.
const BLUE = "#2563eb";
const GREEN = "#16a34a";
const ORANGE = "#f59e0b";
const SURFACE = "#ffffff";
const AXIS = { fontSize: 12, fill: "#64748b" };

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

function TooltipBox({
  active,
  label,
  rows,
}: {
  active?: boolean;
  label?: string;
  rows: { color: string; name: string; value: number }[];
}) {
  if (!active) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="mb-1 font-semibold text-foreground">{label}</div>
      {rows.map((r) => (
        <div key={r.name} className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2 rounded-sm" style={{ background: r.color }} />
          {r.name}
          <span className="tabular ml-auto pl-4 font-medium text-foreground">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export function MonthlyMovementChart({ data }: { data: MonthPoint[] }) {
  const empty = data.every((d) => d.outings === 0);
  return (
    <div>
      <div className="mb-2 flex justify-end">
        <Legend
          items={[
            { color: BLUE, label: "Total Outings" },
            { color: GREEN, label: "Employees Out" },
          ]}
        />
      </div>
      <div className="relative h-[220px]">
        {empty && <p className="absolute inset-0 z-10 flex items-center justify-center text-sm text-muted-foreground">No movement in the last 6 months.</p>}
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4} barCategoryGap="22%" margin={{ top: 18, right: 4, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="month" interval="preserveStartEnd" minTickGap={8} tick={AXIS} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: "rgba(148,163,184,0.12)" }}
              content={({ active, label, payload }) => (
                <TooltipBox
                  active={active}
                  label={String(label)}
                  rows={[
                    { color: BLUE, name: "Total Outings", value: Number(payload?.[0]?.value ?? 0) },
                    { color: GREEN, name: "Employees Out", value: Number(payload?.[1]?.value ?? 0) },
                  ]}
                />
              )}
            />
            <Bar isAnimationActive={false} dataKey="outings" fill={BLUE} radius={[4, 4, 0, 0]} maxBarSize={28}>
              <LabelList dataKey="outings" position="top" className="fill-foreground text-[11px] font-semibold" />
            </Bar>
            <Bar isAnimationActive={false} dataKey="employees" fill={GREEN} radius={[4, 4, 0, 0]} maxBarSize={28}>
              <LabelList dataKey="employees" position="top" className="fill-foreground text-[11px] font-semibold" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function DailyEntriesChart({ data }: { data: DayPoint[] }) {
  return (
    <div>
      <div className="mb-2 flex justify-end">
        <Legend
          items={[
            { color: GREEN, label: "Completed" },
            { color: ORANGE, label: "Pending IN" },
          ]}
        />
      </div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="28%" margin={{ top: 18, right: 4, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="day" interval="preserveStartEnd" minTickGap={6} tick={AXIS} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: "rgba(148,163,184,0.12)" }}
              content={({ active, label, payload }) => {
                const p = payload?.[0]?.payload as DayPoint | undefined;
                return (
                  <TooltipBox
                    active={active}
                    label={String(label)}
                    rows={[
                      { color: GREEN, name: "Completed", value: p?.completed ?? 0 },
                      { color: ORANGE, name: "Pending IN", value: p?.pending ?? 0 },
                    ]}
                  />
                );
              }}
            />
            {/* 2px surface stroke separates stacked segments */}
            <Bar isAnimationActive={false} dataKey="completed" stackId="d" fill={GREEN} stroke={SURFACE} strokeWidth={2} maxBarSize={40} />
            <Bar isAnimationActive={false} dataKey="pending" stackId="d" fill={ORANGE} stroke={SURFACE} strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={40}>
              <LabelList dataKey="total" position="top" className="fill-foreground text-[12px] font-semibold" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
