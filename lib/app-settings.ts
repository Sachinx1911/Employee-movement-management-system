// Application settings stored as one JSON row (Setting.key = "app").
// Shared by client and server; `normalizeAppSettings` makes any stored value safe.

export type AppSettings = {
  company: { name: string; tagline: string; address: string; phone: string; email: string };
  workingHours: { start: string; end: string; lunchStart: string; lunchEnd: string };
  app: { requireAuthorization: boolean; showSuccessToast: boolean; longOutingHours: number };
  notifications: { email: boolean; entryReminders: boolean; dailyReportEmail: boolean; monthlyReportEmail: boolean };
  backup: { frequency: "daily" | "weekly" | "monthly" | "off"; retentionYears: number };
  appearance: { landingAdmin: "/dashboard" | "/new-entry" | "/daily-report"; landingStaff: "/dashboard" | "/new-entry" | "/daily-report" };
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  company: { name: "DDSR GROUP", tagline: "Builders & Developers", address: "Navi Mumbai, Maharashtra, India", phone: "", email: "" },
  workingHours: { start: "09:30", end: "19:00", lunchStart: "13:00", lunchEnd: "14:00" },
  app: { requireAuthorization: false, showSuccessToast: true, longOutingHours: 6 },
  notifications: { email: false, entryReminders: true, dailyReportEmail: false, monthlyReportEmail: false },
  backup: { frequency: "off", retentionYears: 3 },
  appearance: { landingAdmin: "/dashboard", landingStaff: "/new-entry" },
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const LANDINGS = ["/dashboard", "/new-entry", "/daily-report"] as const;
const FREQ = ["daily", "weekly", "monthly", "off"] as const;

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const str = (v: unknown, d: string, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : d);
const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
const time = (v: unknown, d: string) => (typeof v === "string" && TIME.test(v) ? v : d);
const pick = <T extends string>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d);
const int = (v: unknown, d: number, min: number, max: number) => (typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : d);

export function normalizeAppSettings(value: unknown): AppSettings {
  const v = obj(value);
  const D = DEFAULT_APP_SETTINGS;
  const c = obj(v.company);
  const w = obj(v.workingHours);
  const a = obj(v.app);
  const n = obj(v.notifications);
  const b = obj(v.backup);
  const ap = obj(v.appearance);
  return {
    company: {
      name: str(c.name, D.company.name, 60) || D.company.name,
      tagline: str(c.tagline, D.company.tagline, 60),
      address: str(c.address, D.company.address, 200),
      phone: str(c.phone, D.company.phone, 20),
      email: str(c.email, D.company.email, 80),
    },
    workingHours: {
      start: time(w.start, D.workingHours.start),
      end: time(w.end, D.workingHours.end),
      lunchStart: time(w.lunchStart, D.workingHours.lunchStart),
      lunchEnd: time(w.lunchEnd, D.workingHours.lunchEnd),
    },
    app: {
      requireAuthorization: bool(a.requireAuthorization, D.app.requireAuthorization),
      showSuccessToast: bool(a.showSuccessToast, D.app.showSuccessToast),
      longOutingHours: int(a.longOutingHours, D.app.longOutingHours, 1, 24),
    },
    notifications: {
      email: bool(n.email, D.notifications.email),
      entryReminders: bool(n.entryReminders, D.notifications.entryReminders),
      dailyReportEmail: bool(n.dailyReportEmail, D.notifications.dailyReportEmail),
      monthlyReportEmail: bool(n.monthlyReportEmail, D.notifications.monthlyReportEmail),
    },
    backup: { frequency: pick(b.frequency, FREQ, D.backup.frequency), retentionYears: int(b.retentionYears, D.backup.retentionYears, 1, 20) },
    appearance: {
      landingAdmin: pick(ap.landingAdmin, LANDINGS, D.appearance.landingAdmin),
      landingStaff: pick(ap.landingStaff, LANDINGS, D.appearance.landingStaff),
    },
  };
}
