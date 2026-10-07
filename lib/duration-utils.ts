// Duration helpers. Durations are stored as whole minutes; formatting is
// always derived here, never stored.

const MS_PER_MINUTE = 60_000;

/** Whole minutes between OUT and IN. Throws if IN is before OUT. */
export function calculateDurationMinutes(outTime: Date, inTime: Date): number {
  const diff = inTime.getTime() - outTime.getTime();
  if (Number.isNaN(diff)) throw new Error("Invalid time value");
  if (diff < 0) throw new Error("IN time cannot be earlier than OUT time.");
  return Math.floor(diff / MS_PER_MINUTE);
}

/** Compact form for tables and cards: "3H 18M", "52M", "0M". */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null || Number.isNaN(minutes)) return "—";
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}M`;
  if (m === 0) return `${h}H`;
  return `${h}H ${m}M`;
}

/** WhatsApp report form: "3HR 18Mins", "52Mins", "2HR". */
export function formatDurationReport(minutes: number | null | undefined): string {
  if (minutes == null || Number.isNaN(minutes)) return "-";
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}Mins`;
  if (m === 0) return `${h}HR`;
  return `${h}HR ${m}Mins`;
}

/** Human sentence for toasts: "3 Hours 18 Minutes", "52 Minutes". */
export function formatDurationLong(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h} ${h === 1 ? "Hour" : "Hours"}`);
  if (m || !h) parts.push(`${m} ${m === 1 ? "Minute" : "Minutes"}`);
  return parts.join(" ");
}

/** Minutes elapsed since OUT for someone still outside. */
export function minutesSince(outTime: Date, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - outTime.getTime()) / MS_PER_MINUTE));
}

/** New Entry grid badge: "52 Mins", "3H 18M", "1H 06M". */
export function formatDurationBadge(minutes: number | null | undefined): string {
  if (minutes == null || Number.isNaN(minutes)) return "-";
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total} Min${total === 1 ? "" : "s"}`;
  return `${Math.floor(total / 60)}H ${String(total % 60).padStart(2, "0")}M`;
}
