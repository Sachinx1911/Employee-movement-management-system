"use client";

import {
  Bell,
  Building2,
  CalendarDays,
  Clock,
  Database,
  Download,
  FileText,
  Loader2,
  Mail,
  Palette,
  RotateCcw,
  Save,
  Settings2,
  Shield,
  Timer,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { removeLogo, saveAppSettings, saveLogo } from "@/lib/actions/settings";
import { DEFAULT_APP_SETTINGS, type AppSettings } from "@/lib/app-settings";
import { cn } from "@/lib/utils";
import { SectionCard, ToggleRow } from "./section-card";
import { SecurityPanel, type AuditRow } from "./security-panel";
import { UsersPanel, type UserRow } from "./users-panel";

export type SettingsTab = "general" | "hours" | "notifications" | "backup" | "users" | "appearance" | "security";

const TABS: { id: SettingsTab; label: string; icon: LucideIcon }[] = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "hours", label: "Working Hours", icon: Clock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "backup", label: "Data & Backup", icon: Database },
  { id: "users", label: "Users & Access", icon: Users },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "security", label: "System & Security", icon: Shield },
];

const LANDING = [
  { value: "/dashboard", label: "Dashboard" },
  { value: "/new-entry", label: "New Entry" },
  { value: "/daily-report", label: "Daily Report" },
];

function TimeInput({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="time" value={value} onChange={(e) => onChange(e.target.value)} className="tabular h-10" />
    </div>
  );
}

function ReadOnlySelect({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex h-10 items-center rounded-lg border bg-muted/40 px-3 text-sm" title={note}>
        {value}
      </div>
    </div>
  );
}

export function SettingsView({
  tab: initialTab,
  settings,
  logo,
  smtpConfigured,
  users,
  meId,
  audit,
}: {
  tab: SettingsTab;
  settings: AppSettings;
  logo: string | null;
  smtpConfigured: boolean;
  users: UserRow[];
  meId: string;
  audit: { rows: AuditRow[]; page: number; total: number; pageSize: number };
}) {
  const router = useRouter();
  const [tab, setTab] = useState(initialTab);
  const [form, setForm] = useState(settings);
  const [saving, startSave] = useTransition();
  const [logoBusy, startLogo] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(settings);

  const set = <K extends keyof AppSettings>(group: K, patch: Partial<AppSettings[K]>) => setForm((f) => ({ ...f, [group]: { ...f[group], ...patch } }));

  const selectTab = (t: SettingsTab) => {
    setTab(t);
    router.replace(`/settings?tab=${t}`, { scroll: false });
  };

  const onLogo = (file: File | undefined) => {
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) return toast.error("Logo must be a PNG or JPG image.");
    if (file.size > 2 * 1024 * 1024) return toast.error("Logo must be 2 MB or smaller.");
    const reader = new FileReader();
    reader.onload = () =>
      startLogo(async () => {
        const r = await saveLogo(String(reader.result));
        if (r.ok) toast.success(r.message);
        else toast.error(r.error);
      });
    reader.readAsDataURL(file);
  };

  const show = (...ids: SettingsTab[]) => ids.includes(tab);

  const company = (
    <SectionCard icon={Building2} title="Company Information" subtitle="Set your company details, logo and contact information.">
      <div className="grid gap-4 md:grid-cols-[200px_minmax(0,1fr)]">
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL from settings
            <img src={logo} alt="Company logo" className="max-h-20 max-w-full object-contain" />
          ) : (
            <Building2 className="size-12 text-primary" strokeWidth={1.5} />
          )}
          <div className="text-sm font-medium">{logo ? "Company Logo" : "Upload Logo"}</div>
          <div className="text-xs text-muted-foreground">PNG, JPG (Max 2MB)</div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="text-primary" onClick={() => fileRef.current?.click()} disabled={logoBusy}>
              {logoBusy ? <Loader2 className="animate-spin" /> : <Upload />} {logo ? "Change Logo" : "Upload"}
            </Button>
            {logo && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={logoBusy}
                onClick={() =>
                  startLogo(async () => {
                    const r = await removeLogo();
                    if (r.ok) toast.success(r.message);
                    else toast.error(r.error);
                  })
                }
              >
                Remove
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="c-name">
              Company Name <span className="text-destructive">*</span>
            </Label>
            <Input id="c-name" value={form.company.name} onChange={(e) => set("company", { name: e.target.value })} className="h-10" maxLength={60} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-address">Address</Label>
            <Textarea id="c-address" rows={2} value={form.company.address} onChange={(e) => set("company", { address: e.target.value })} maxLength={200} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="c-phone">Contact Number</Label>
              <Input id="c-phone" inputMode="tel" value={form.company.phone} onChange={(e) => set("company", { phone: e.target.value })} className="h-10" maxLength={20} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-email">Email ID</Label>
              <Input id="c-email" type="email" value={form.company.email} onChange={(e) => set("company", { email: e.target.value })} className="h-10" maxLength={80} />
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );

  const hours = (
    <SectionCard icon={Clock} title="Working Hours (Default)" subtitle="Set default office working hours and break time.">
      <div className="grid gap-3 sm:grid-cols-2">
        <TimeInput id="wh-start" label="Office Start Time" value={form.workingHours.start} onChange={(v) => set("workingHours", { start: v })} />
        <TimeInput id="wh-end" label="Office End Time" value={form.workingHours.end} onChange={(v) => set("workingHours", { end: v })} />
        <TimeInput id="wh-ls" label="Default Lunch Start" value={form.workingHours.lunchStart} onChange={(v) => set("workingHours", { lunchStart: v })} />
        <TimeInput id="wh-le" label="Default Lunch End" value={form.workingHours.lunchEnd} onChange={(v) => set("workingHours", { lunchEnd: v })} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Entries going out before office start or returning after office end are flagged for attention.</p>
    </SectionCard>
  );

  const notifications = (
    <SectionCard icon={Bell} title="Notification Settings" subtitle="Manage alert and notification preferences.">
      <ToggleRow icon={Bell} title="Entry Reminders" text="Show attention alerts (missing IN, long outings) on the bell">
        <Switch checked={form.notifications.entryReminders} onCheckedChange={(v) => set("notifications", { entryReminders: v })} />
      </ToggleRow>
      <ToggleRow icon={Mail} title="Email Notifications" text={smtpConfigured ? "Receive email notifications for important updates" : "Needs an email server (SMTP) to be configured"}>
        <Switch disabled={!smtpConfigured} checked={smtpConfigured && form.notifications.email} onCheckedChange={(v) => set("notifications", { email: v })} />
      </ToggleRow>
      <ToggleRow icon={Mail} title="Daily Report Email" text={smtpConfigured ? "Send daily report via email" : "Needs an email server (SMTP) to be configured"}>
        <Switch disabled={!smtpConfigured} checked={smtpConfigured && form.notifications.dailyReportEmail} onCheckedChange={(v) => set("notifications", { dailyReportEmail: v })} />
      </ToggleRow>
      <ToggleRow icon={Mail} title="Monthly Report Email" text={smtpConfigured ? "Send monthly summary report via email" : "Needs an email server (SMTP) to be configured"}>
        <Switch disabled={!smtpConfigured} checked={smtpConfigured && form.notifications.monthlyReportEmail} onCheckedChange={(v) => set("notifications", { monthlyReportEmail: v })} />
      </ToggleRow>
    </SectionCard>
  );

  const dateTime = (
    <SectionCard icon={CalendarDays} title="Date & Time Settings" subtitle="Date, time and timezone used across the app and reports.">
      <div className="grid gap-3 sm:grid-cols-2">
        <ReadOnlySelect label="Date Format" value="DD/MM/YYYY (06/10/2026)" note="Fixed to match the WhatsApp report format" />
        <ReadOnlySelect label="Time Format" value="12 Hour (03:14 PM)" note="Fixed to match the WhatsApp report format" />
        <ReadOnlySelect label="First Day of Week" value="Monday" />
        <ReadOnlySelect label="Timezone" value="(GMT+05:30) India Standard Time" note="Set on the server (NEXT_PUBLIC_APP_TIMEZONE)" />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">These are fixed so every report uses the same format.</p>
    </SectionCard>
  );

  const application = (
    <SectionCard icon={Settings2} title="Application Settings" subtitle="General application behaviour settings.">
      <ToggleRow title="Auto-calculate Duration" text="Duration is always calculated from IN − OUT (cannot be turned off)">
        <Switch checked disabled />
      </ToggleRow>
      <ToggleRow title="Allow Duplicate Active Entry" text="Not allowed — an employee can be outside on only one entry at a time">
        <Switch checked={false} disabled />
      </ToggleRow>
      <ToggleRow title="Require Authorization" text="Make Authorized By mandatory on every entry">
        <Switch checked={form.app.requireAuthorization} onCheckedChange={(v) => set("app", { requireAuthorization: v })} />
      </ToggleRow>
      <ToggleRow title="Show Success Notification" text="Show toast notification after saving entries">
        <Switch checked={form.app.showSuccessToast} onCheckedChange={(v) => set("app", { showSuccessToast: v })} />
      </ToggleRow>
      <ToggleRow icon={Timer} title="Long Outing Alert" text="Flag entries longer than this many hours">
        <Select value={String(form.app.longOutingHours)} onValueChange={(v) => set("app", { longOutingHours: Number(v) })}>
          <SelectTrigger className="h-9! w-[100px]" aria-label="Long outing hours">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2, 3, 4, 5, 6, 8, 10, 12].map((h) => (
              <SelectItem key={h} value={String(h)}>
                {h} hours
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ToggleRow>
    </SectionCard>
  );

  const backup = (
    <SectionCard icon={Database} title="Data & Backup" subtitle="Manage data backup, export and retention settings.">
      <ToggleRow icon={Database} title="Automatic Backup" text="Scheduled backups run from a server job (see README)">
        <Select value={form.backup.frequency} onValueChange={(v) => set("backup", { frequency: v as AppSettings["backup"]["frequency"] })}>
          <SelectTrigger className="h-9! w-[120px]" aria-label="Backup frequency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="off">Off</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </ToggleRow>
      <ToggleRow icon={Download} title="Download Backup" text="Full backup of all records as a JSON file">
        <Button asChild variant="outline" className="h-9 border-primary/40 text-primary hover:bg-blue-50">
          <a href="/api/backup">
            <Download /> Download Backup
          </a>
        </Button>
      </ToggleRow>
      <ToggleRow icon={FileText} title="Data Retention" text="Records are never deleted automatically; this is the minimum period to keep">
        <Select value={String(form.backup.retentionYears)} onValueChange={(v) => set("backup", { retentionYears: Number(v) })}>
          <SelectTrigger className="h-9! w-[150px]" aria-label="Retention years">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 5, 7, 10].map((y) => (
              <SelectItem key={y} value={String(y)}>
                Keep Last {y} {y === 1 ? "Year" : "Years"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ToggleRow>
    </SectionCard>
  );

  const appearance = (
    <SectionCard icon={Palette} title="Appearance" subtitle="Company tagline and the first page shown after login.">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="c-tagline">Tagline (shown on dashboard)</Label>
          <Input id="c-tagline" value={form.company.tagline} onChange={(e) => set("company", { tagline: e.target.value })} className="h-10" maxLength={60} />
        </div>
        {(
          [
            ["landingAdmin", "Admin opens on"],
            ["landingStaff", "Staff opens on"],
          ] as const
        ).map(([k, label]) => (
          <div key={k} className="space-y-1.5">
            <Label>{label}</Label>
            <Select value={form.appearance[k]} onValueChange={(v) => set("appearance", { [k]: v } as Partial<AppSettings["appearance"]>)}>
              <SelectTrigger className="h-10! w-full" aria-label={label}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANDING.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </SectionCard>
  );

  const savesForm = !show("users", "security");

  return (
    <div className="space-y-4 pb-20">
      <div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-[28px]">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manage application preferences, working hours, notifications and data settings.</p>
      </div>

      <div role="tablist" className="flex gap-1 overflow-x-auto rounded-xl border bg-card p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => selectTab(id)}
            className={cn(
              "relative flex h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors",
              tab === id ? "text-primary after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-primary" : "text-foreground/80 hover:bg-muted",
            )}
          >
            <Icon className="size-[18px]" />
            {label}
          </button>
        ))}
      </div>

      {tab === "general" && (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-4">
            {company}
            {hours}
            {notifications}
          </div>
          <div className="space-y-4">
            {dateTime}
            {application}
            {backup}
          </div>
        </div>
      )}
      {tab === "hours" && <div className="max-w-3xl">{hours}</div>}
      {tab === "notifications" && <div className="max-w-3xl">{notifications}</div>}
      {tab === "backup" && <div className="max-w-3xl">{backup}</div>}
      {tab === "appearance" && (
        <div className="grid max-w-5xl gap-4 xl:grid-cols-2">
          {appearance}
          {company}
        </div>
      )}
      {tab === "users" && <UsersPanel users={users} meId={meId} />}
      {tab === "security" && <SecurityPanel audit={audit.rows} page={audit.page} total={audit.total} pageSize={audit.pageSize} />}

      {savesForm && (
        <div className="sticky bottom-[84px] z-10 flex flex-wrap items-center justify-end gap-3 rounded-2xl border bg-card/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
          {dirty && <span className="mr-auto text-sm text-muted-foreground">You have unsaved changes</span>}
          <Button variant="outline" className="h-11 px-5" onClick={() => setForm(DEFAULT_APP_SETTINGS)} disabled={saving}>
            <RotateCcw /> Reset to Default
          </Button>
          <Button
            className="h-11 px-6"
            disabled={saving || !dirty}
            onClick={() =>
              startSave(async () => {
                const r = await saveAppSettings(form);
                if (r.ok) toast.success(r.message);
                else toast.error(r.error);
              })
            }
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save />} Save Settings
          </Button>
        </div>
      )}
    </div>
  );
}
