// Date/time helpers bound to the business timezone (default Asia/Kolkata).
// Instants are stored in UTC; anything a user sees or types is in APP_TIMEZONE.
import { TZDate } from "@date-fns/tz";
import { format, isValid } from "date-fns";

export const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || "Asia/Kolkata";

/** "yyyy-MM-dd" key used in URLs, forms and as the business date. */
export type DateKey = string;

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== "string" || !DATE_KEY_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

export function isTimeString(value: unknown): value is string {
  return typeof value === "string" && TIME_RE.test(value);
}

function inZone(date: Date): TZDate {
  return new TZDate(date.getTime(), APP_TIMEZONE);
}

/** Business date key of an instant. */
export function toDateKey(date: Date = new Date()): DateKey {
  return format(inZone(date), "yyyy-MM-dd");
}

export function todayKey(): DateKey {
  return toDateKey(new Date());
}

/** "HH:mm" (24h) of an instant in the business timezone, for time inputs. */
export function toTimeInput(date: Date = new Date()): string {
  return format(inZone(date), "HH:mm");
}

/** Build an instant from a business date key and "HH:mm". */
export function zonedDateTime(dateKey: DateKey, time: string): Date {
  if (!isDateKey(dateKey)) throw new Error("Invalid date");
  if (!isTimeString(time)) throw new Error("Invalid time");
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const result = new Date(new TZDate(y, m - 1, d, hh, mm, 0, APP_TIMEZONE).getTime());
  if (!isValid(result)) throw new Error("Invalid date/time");
  return result;
}

/** Value for a Postgres DATE column (UTC midnight of the key). */
export function dateKeyToDb(dateKey: DateKey): Date {
  if (!isDateKey(dateKey)) throw new Error("Invalid date");
  return new Date(`${dateKey}T00:00:00.000Z`);
}

/** Inverse of dateKeyToDb. */
export function dbDateToKey(date: Date): DateKey {
  return date.toISOString().slice(0, 10);
}

export function addDaysToKey(dateKey: DateKey, days: number): DateKey {
  const d = dateKeyToDb(dateKey);
  d.setUTCDate(d.getUTCDate() + days);
  return dbDateToKey(d);
}

/** Inclusive first / last day keys of a month (month is 1-12). */
export function monthRange(year: number, month: number): { from: DateKey; to: DateKey } {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const last = new Date(Date.UTC(year, month, 0));
  return { from: dbDateToKey(first), to: dbDateToKey(last) };
}

/** "12:43 PM" */
export function formatTime(date: Date | null | undefined): string {
  if (!date) return "-";
  return format(inZone(date), "hh:mm a");
}

/** WhatsApp style "1:35 PM" (no leading zero). */
export function formatTimeReport(date: Date | null | undefined): string {
  if (!date) return "-";
  return format(inZone(date), "h:mm a");
}

/** "06/10/2026" from a key */
export function formatDateKey(dateKey: DateKey): string {
  const [y, m, d] = dateKey.split("-");
  return `${d}/${m}/${y}`;
}

/** "Tue, 07 Oct 2026" from a key */
export function formatDateKeyLong(dateKey: DateKey): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return format(new TZDate(y, m - 1, d, "UTC"), "EEE, dd MMM yyyy");
}

/** "06/10/2026 12:43 PM" for an instant */
export function formatDateTime(date: Date | null | undefined): string {
  if (!date) return "-";
  return format(inZone(date), "dd/MM/yyyy hh:mm a");
}

/** Current epoch ms — wrapped so render code stays lint-pure. */
export function nowMs(): number {
  return Date.now();
}
