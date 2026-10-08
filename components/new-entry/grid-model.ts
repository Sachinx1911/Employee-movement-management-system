// Client-side model for the New Entry grid: row shape, defaults, merge of
// fresh server data with unsaved edits, and live duration/status.
import type { EntryRow } from "@/lib/queries/movements";

export type GridRow = {
  key: string;
  id?: string;
  employeeId: string;
  locationId: string;
  purposeId: string;
  authorizedById: string;
  outTime: string;
  inTime: string;
  inNextDay: boolean;
  /** Snapshot of the saved values, to detect edits. */
  original?: string;
  savedStatus?: "OUTSIDE" | "COMPLETED";
};

export const MIN_ROWS = 10;
export const MIN_BLANK = 3;

let counter = 0;
export const newKey = () => `r${Date.now().toString(36)}${(counter++).toString(36)}`;

export const snapshot = (r: Pick<GridRow, "employeeId" | "locationId" | "purposeId" | "authorizedById" | "outTime" | "inTime">) =>
  [r.employeeId, r.locationId, r.purposeId, r.authorizedById, r.outTime, r.inTime].join("|");

export function blankRow(key: string = newKey()): GridRow {
  return { key, employeeId: "", locationId: "", purposeId: "", authorizedById: "", outTime: "", inTime: "", inNextDay: false };
}

export function fromEntry(e: EntryRow): GridRow {
  const row = {
    key: e.id,
    id: e.id,
    employeeId: e.employeeId,
    locationId: e.locationId,
    purposeId: e.purposeId,
    authorizedById: e.authorizedById,
    outTime: e.outTime,
    inTime: e.inTime,
    inNextDay: e.inNextDay,
    savedStatus: e.status,
  };
  return { ...row, original: snapshot(row) };
}

export const isBlank = (r: GridRow) => !r.id && !r.employeeId && !r.locationId && !r.purposeId && !r.authorizedById && !r.outTime && !r.inTime;
export const isDirty = (r: GridRow) => !r.id ? !isBlank(r) : snapshot(r) !== r.original;
export const markClean = (r: GridRow): GridRow => ({ ...r, original: snapshot(r) });

export function pad(rows: GridRow[], makeKey: (n: number) => string = () => newKey()): GridRow[] {
  const out = [...rows];
  let blanks = out.filter(isBlank).length;
  while (out.length < MIN_ROWS || blanks < MIN_BLANK) {
    out.push(blankRow(makeKey(blanks)));
    blanks++;
  }
  return out;
}

/**
 * Initial rows. Blank rows get stable keys ("init-0", …) so the server-rendered
 * HTML and the browser agree (time-based keys would cause a hydration mismatch).
 */
export function build(entries: EntryRow[]): GridRow[] {
  return pad(entries.map(fromEntry), (n) => `init-${n}`);
}

/**
 * Fresh server rows replace saved rows unless the user is editing them; rows keep
 * their on-screen position, entries new on the server are added before the blanks.
 */
export function merge(current: GridRow[], entries: EntryRow[]): GridRow[] {
  const fresh = new Map(entries.map((e) => [e.id, e]));
  const seen = new Set<string>();
  const kept: GridRow[] = [];
  for (const r of current) {
    if (!r.id) {
      kept.push(r);
      continue;
    }
    const e = fresh.get(r.id);
    if (!e || seen.has(r.id)) continue; // deleted elsewhere, or duplicate
    seen.add(r.id);
    kept.push(isDirty(r) ? r : { ...fromEntry(e), key: r.key });
  }
  const added = entries.filter((e) => !seen.has(e.id)).map(fromEntry);
  const firstBlank = kept.findIndex(isBlank);
  const at = firstBlank === -1 ? kept.length : firstBlank;
  return pad([...kept.slice(0, at), ...added, ...kept.slice(at)]);
}

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** Live duration (minutes) or null; negative means IN is before OUT. */
export function liveDuration(r: GridRow): number | null {
  if (!r.outTime || !r.inTime) return null;
  return toMin(r.inTime) + (r.inNextDay ? 1440 : 0) - toMin(r.outTime);
}

export type RowState = "blank" | "pending" | "completed" | "invalid";

export function rowState(r: GridRow): RowState {
  if (isBlank(r)) return "blank";
  const d = liveDuration(r);
  if (d !== null && d < 0) return "invalid";
  if (r.inTime) return "completed";
  return r.employeeId || r.outTime ? "pending" : "blank";
}

/**
 * Parse "12:43 PM", "1:35pm", "13:05", "1305", "7p", "9.30" → "HH:mm" (or null).
 * Without AM/PM, hours below `assumePmBelow` (e.g. 8) are read as PM.
 */
export function parseTime(raw: string, opts: { assumePmBelow?: number } = {}): string | null {
  const s = raw.trim().toLowerCase().replace(/\./g, ":").replace(/\s+/g, "");
  if (!s) return null;
  const m = s.match(/^(\d{1,2})(?::?(\d{2}))?(a|am|p|pm)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const suffix = m[3];
  if (suffix) {
    if (h < 1 || h > 12) return null;
    const pm = suffix.startsWith("p");
    if (pm && h !== 12) h += 12;
    if (!pm && h === 12) h = 0;
  } else if (opts.assumePmBelow && h >= 1 && h < opts.assumePmBelow) {
    h += 12;
  }
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
