import type { Metadata } from "next";
import { Dancing_Script } from "next/font/google";
import {
  Building2,
  Clock3,
  FileText,
  MapPin,
  Users,
  UserCheck,
  NotebookText,
  type LucideIcon,
} from "lucide-react";
import { DailyEntriesChart, MonthlyMovementChart } from "@/components/dashboard/charts";
import { Panel } from "@/components/dashboard/overview-table";
import { StatCard } from "@/components/shared/stat-card";
import { requireUser } from "@/lib/auth-guard";
import { getAppSettings } from "@/lib/queries/settings";
import { formatDateKey } from "@/lib/date-utils";
import { entriesLast7Days, masterKpis, movementByMonth, todaySummary } from "@/lib/queries/dashboard";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const script = Dancing_Script({ subsets: ["latin"], weight: ["600"] });

function SummaryRow({ icon: Icon, tile, label, value }: { icon: LucideIcon; tile: string; label: string; value: number }) {
  return (
    <li className="flex items-center gap-3 py-1.5">
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", tile)}>
        <Icon className="size-[18px]" />
      </span>
      <span className="flex-1 text-sm">{label}</span>
      <span className="tabular flex h-8 min-w-14 items-center justify-center rounded-md bg-muted px-3 text-[15px] font-semibold">{value}</span>
    </li>
  );
}

function HeroCard() {
  return (
    <div className="relative hidden min-h-[128px] overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e4a7a] via-navy to-[#0f2440] 2xl:block">
      <svg viewBox="0 0 200 130" className="absolute bottom-0 left-2 h-[90%] text-white/15" aria-hidden>
        <rect x="10" y="40" width="50" height="90" fill="currentColor" />
        <rect x="65" y="10" width="60" height="120" fill="currentColor" />
        {Array.from({ length: 10 }).flatMap((_, r) =>
          [73, 87, 101, 115].map((x) => <rect key={`${r}-${x}`} x={x - 2} y={18 + r * 11} width="7" height="6" fill="#ffffff" opacity="0.35" />),
        )}
        {Array.from({ length: 7 }).flatMap((_, r) =>
          [16, 30, 44].map((x) => <rect key={`b${r}-${x}`} x={x} y={48 + r * 11} width="7" height="6" fill="#ffffff" opacity="0.3" />),
        )}
      </svg>
      <div className="relative flex h-full flex-col items-end justify-center p-4 text-right font-serif text-lg font-semibold leading-tight text-white">
        <span>Our Projects</span>
        <span>Our People</span>
        <span>Our Growth</span>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const [kpi, months, days, summary, settings] = await Promise.all([masterKpis(), movementByMonth(), entriesLast7Days(), todaySummary(), getAppSettings()]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-[28px]">Welcome, {user.name} 👋</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Here&apos;s what&apos;s happening across your organization today.</p>
        </div>
        <div className="hidden items-center gap-4 md:flex">
          <div className="flex items-center gap-2.5">
            <Building2 className="size-10 text-navy" strokeWidth={1.6} />
            <div className="leading-tight">
              <div className="text-lg font-bold tracking-wide text-navy">{settings.company.name}</div>
              <div className="text-xs text-muted-foreground">{settings.company.tagline}</div>
            </div>
          </div>
          <div className={cn(script.className, "rounded-xl bg-gradient-to-br from-amber-50 to-orange-100/70 px-4 py-1.5 text-center text-lg leading-tight text-amber-800 shadow-sm")}>
            Building
            <br />
            Better Tomorrows
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.2fr)]">
        <StatCard tinted tone="blue" icon={Users} label="Total Employees" value={kpi.employees.total} delta={kpi.employees.added} sub={`Active Employees: ${kpi.employees.active}`} />
        <StatCard tinted tone="green" icon={MapPin} label="Total Locations" value={kpi.locations.total} delta={kpi.locations.added} sub={`Active Locations: ${kpi.locations.active}`} />
        <StatCard tinted tone="purple" icon={NotebookText} label="Total Purposes" value={kpi.purposes.total} delta={kpi.purposes.added} sub={`Active Purposes: ${kpi.purposes.active}`} />
        <StatCard tinted tone="orange" icon={UserCheck} label="Authorized Persons" value={kpi.authorizers.total} delta={kpi.authorizers.added} sub={`Active Persons: ${kpi.authorizers.active}`} />
        <HeroCard />
      </div>

      {/* Charts + summary */}
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_340px]">
        <Panel title="Employee Movement (Last 6 Months)">
          <MonthlyMovementChart data={months} />
        </Panel>
        <Panel title="Daily Entries (Last 7 Days)">
          <DailyEntriesChart data={days} />
        </Panel>
        <Panel
          className="lg:col-span-2 2xl:col-span-1"
          title="Today's Summary"
          action={<span className="tabular text-sm text-muted-foreground">{formatDateKey(summary.today)}</span>}
        >
          <ul className="grid gap-x-6 sm:grid-cols-2 2xl:grid-cols-1">
            <SummaryRow icon={Users} tile="bg-blue-50 text-blue-600" label="New Employees" value={summary.employees} />
            <SummaryRow icon={MapPin} tile="bg-emerald-50 text-emerald-600" label="New Locations" value={summary.locations} />
            <SummaryRow icon={NotebookText} tile="bg-violet-50 text-violet-600" label="New Purposes" value={summary.purposes} />
            <SummaryRow icon={UserCheck} tile="bg-orange-50 text-orange-500" label="New Authorization" value={summary.authorizers} />
            <SummaryRow icon={FileText} tile="bg-blue-50 text-blue-600" label="Today's Entries" value={summary.entries} />
            <SummaryRow icon={Clock3} tile="bg-amber-50 text-amber-500" label="Pending IN" value={summary.pending} />
          </ul>
        </Panel>
      </div>

    </div>
  );
}
