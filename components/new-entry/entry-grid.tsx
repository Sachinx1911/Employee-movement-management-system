"use client";

import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CloudCheck,
  Copy,
  Loader2,
  Plus,
  RotateCcw,
  Send,
  Timer,
  Trash2,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { markIn, quickCreateLocation, quickCreatePurpose, saveDayEntries } from "@/lib/actions/movements";
import { addDaysToKey, nowMs, todayKey, toTimeInput, type DateKey } from "@/lib/date-utils";
import { formatDuration, formatDurationBadge } from "@/lib/duration-utils";
import { entrySuccess } from "@/lib/notify";
import type { EntryOptions, EntryRow, PendingIn } from "@/lib/queries/movements";
import { cn } from "@/lib/utils";
import { blankRow, build, focusedRowKey, isBlank, isDirty, liveDuration, merge, newKey, pad, rowState, snapshot, sortByOutTime, type GridRow } from "./grid-model";
import { PendingInStrip } from "./pending-in-strip";
import { TimeText } from "./time-text";
import { Typeahead, type TypeOption } from "./typeahead";
import { VoidDialog } from "./void-dialog";

const NIL = "__nil__";
const AUTOSAVE_DELAY = 3200;
const IDLE_BEFORE_SAVE = 3000;

function DurationBadge({ row }: { row: GridRow }) {
  const d = liveDuration(row);
  if (d === null) return <span className="flex h-8 items-center justify-center rounded-md bg-muted/70 text-muted-foreground">-</span>;
  if (d < 0) return <span className="flex h-8 items-center justify-center rounded-md bg-red-50 px-2 text-xs font-medium text-red-600">IN &lt; OUT</span>;
  return (
    <span className="tabular flex h-8 items-center justify-center whitespace-nowrap rounded-md bg-emerald-100 px-2 text-[13px] font-semibold text-emerald-800">
      {formatDurationBadge(d)}
    </span>
  );
}

function StatusCell({ row }: { row: GridRow }) {
  const s = rowState(row);
  const base = "flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs font-medium";
  if (s === "blank") return <span className={cn(base, "bg-muted/70 text-muted-foreground")}>-</span>;
  if (s === "invalid") return <span className={cn(base, "bg-red-50 text-red-600")}>Check time</span>;
  if (s === "completed")
    return (
      <span className={cn(base, "bg-emerald-50 text-emerald-700")}>
        <span className="size-1.5 rounded-full bg-emerald-500" /> Completed
      </span>
    );
  return (
    <span className={cn(base, "bg-amber-50 text-amber-600")}>
      <span className="size-1.5 rounded-full bg-amber-500" /> Pending IN
    </span>
  );
}

/** Per-row save indicator shown next to the row number. */
function SaveDot({ state }: { state: "saving" | "saved" | "error" | "unsaved" | null }) {
  if (state === "saving") return <Loader2 className="size-3.5 animate-spin text-primary" aria-label="Saving" />;
  if (state === "saved") return <Check className="size-3.5 text-emerald-600" aria-label="Saved" />;
  if (state === "error") return <AlertCircle className="size-3.5 text-destructive" aria-label="Not saved" />;
  if (state === "unsaved") return <span className="size-1.5 rounded-full bg-amber-500" aria-label="Incomplete" />;
  return null;
}

const isReady = (r: GridRow) => isDirty(r) && !isBlank(r) && !!r.employeeId && !!r.locationId && !!r.outTime && rowState(r) !== "invalid";

export function EntryGrid({
  date,
  entries,
  options,
  pending,
  canCreate,
  canEditAll,
  canDelete,
  showPending,
}: {
  date: DateKey;
  entries: EntryRow[];
  options: EntryOptions;
  pending: PendingIn[];
  canCreate: boolean;
  canEditAll: boolean;
  canDelete: boolean;
  showPending: boolean;
}) {
  const router = useRouter();
  const today = todayKey();
  const isToday = date === today;

  const [rows, setRows] = useState<GridRow[]>(() => build(entries));
  const [prevEntries, setPrevEntries] = useState(entries);
  if (entries !== prevEntries) {
    setPrevEntries(entries);
    setRows((r) => sortByOutTime(merge(r, entries), focusedRowKey()));
  }
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savingKeys, setSavingKeys] = useState<ReadonlySet<string>>(new Set());
  const [savedKeys, setSavedKeys] = useState<ReadonlySet<string>>(new Set());
  const [extraLocations, setExtraLocations] = useState<EntryOptions["locations"]>([]);
  const [extraPurposes, setExtraPurposes] = useState<EntryOptions["purposes"]>([]);
  const [voiding, setVoiding] = useState<{ id: string; label: string } | null>(null);
  const [marking, setMarking] = useState<string | null>(null);

  const rowsRef = useRef(rows);
  const errorsRef = useRef(errors);
  const savingRef = useRef(new Set<string>());
  const lastEditRef = useRef(new Map<string, number>());
  useEffect(() => {
    rowsRef.current = rows;
    errorsRef.current = errors;
  });

  const locations = useMemo(() => [...options.locations, ...extraLocations.filter((x) => !options.locations.some((l) => l.id === x.id))], [options.locations, extraLocations]);
  const purposes = useMemo(() => [...options.purposes, ...extraPurposes.filter((x) => !options.purposes.some((p) => p.id === x.id))], [options.purposes, extraPurposes]);
  const empName = useMemo(() => new Map(options.employees.map((e) => [e.id, e.name])), [options.employees]);
  const locName = useMemo(() => new Map(locations.map((l) => [l.id, l.name])), [locations]);

  const opt = {
    employees: (current: string): TypeOption[] =>
      options.employees.filter((e) => e.active || e.id === current).map((e) => ({ value: e.id, label: e.name, hint: e.code ?? undefined })),
    locations: (current: string): TypeOption[] => locations.filter((l) => l.active || l.id === current).map((l) => ({ value: l.id, label: l.name, hint: l.area ?? undefined })),
    purposes: (current: string): TypeOption[] => purposes.filter((p) => p.active || p.id === current).map((p) => ({ value: p.id, label: p.name })),
    authorizers: (current: string): TypeOption[] => [
      { value: NIL, label: "NIL" },
      ...options.authorizers.filter((a) => a.active || a.id === current).map((a) => ({ value: a.id, label: a.name })),
    ],
  };

  // ── Auto-save ────────────────────────────────────────────────────────────
  /** Save ready rows. A row is saved when focus has left it (`leftKey`) or it has been idle for a few seconds. */
  const flush = useCallback(async (leftKey?: string) => {
    const focusedKey = focusedRowKey();
    const now = Date.now();
    const batch = rowsRef.current.filter(
      (r) =>
        isReady(r) &&
        !savingRef.current.has(r.key) &&
        !errorsRef.current[r.key] &&
        r.key !== focusedKey &&
        (r.key === leftKey || now - (lastEditRef.current.get(r.key) ?? 0) >= IDLE_BEFORE_SAVE),
    );
    if (!batch.length) return;

    const keys = batch.map((r) => r.key);
    keys.forEach((k) => savingRef.current.add(k));
    setSavingKeys(new Set(savingRef.current));
    const sent = new Map(batch.map((r) => [r.key, r]));

    const res = await saveDayEntries(
      date,
      batch.map((r) => ({
        key: r.key,
        id: r.id,
        employeeId: r.employeeId,
        locationId: r.locationId,
        purposeId: r.purposeId,
        authorizedById: r.authorizedById,
        outTime: r.outTime,
        inTime: r.inTime,
        inNextDay: r.inNextDay,
      })),
    ).catch(() => ({ ok: false as const, error: "Network problem — will retry on the next change." }));

    keys.forEach((k) => savingRef.current.delete(k));
    setSavingKeys(new Set(savingRef.current));

    if (!res.ok) {
      const rowErrors = "rowErrors" in res && res.rowErrors ? res.rowErrors : null;
      if (rowErrors) setErrors((e) => ({ ...e, ...rowErrors }));
      else toast.error(res.error);
      return;
    }

    const newIds = new Set(Object.values(res.ids));
    setRows((rs) =>
      pad(
        sortByOutTime(
          rs
            // Drop copies a server refresh may already have merged in.
            .filter((r) => !(r.id && newIds.has(r.id) && !sent.has(r.key)))
            .map((r) => {
              const s = sent.get(r.key);
              if (!s) return r;
              return { ...r, id: r.id ?? res.ids[r.key], original: snapshot(s), savedStatus: s.inTime ? "COMPLETED" : "OUTSIDE" };
            }),
          focusedRowKey(),
        ),
      ),
    );
    setSavedKeys((prev) => new Set([...prev, ...keys]));
    if (res.created || res.updated) entrySuccess(res.message);
  }, [date]);

  useEffect(() => {
    const t = setTimeout(() => void flush(), AUTOSAVE_DELAY);
    return () => clearTimeout(t);
  }, [rows, errors, flush]);

  const busy = savingKeys.size > 0;
  // Without "create" permission the empty rows for new entries are not shown.
  const shown = canCreate ? rows : rows.filter((r) => !!r.id);
  const dirtyRows = rows.filter((r) => isDirty(r) && !isBlank(r));
  const hasUnsaved = dirtyRows.length > 0 || busy;
  useEffect(() => {
    if (!hasUnsaved) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsaved]);

  // ── Stats ────────────────────────────────────────────────────────────────
  const active = rows.filter((r) => !isBlank(r) && r.employeeId);
  const completed = active.filter((r) => rowState(r) === "completed");
  const totalMinutes = completed.reduce((s, r) => s + (liveDuration(r) ?? 0), 0);
  const incomplete = dirtyRows.filter((r) => !isReady(r) && !errors[r.key]).length;
  const errorCount = Object.keys(errors).length;

  const update = (key: string, patch: Partial<GridRow>) => {
    lastEditRef.current.set(key, nowMs());
    setRows((rs) =>
      pad(
        rs.map((r) => {
          if (r.key !== key) return r;
          const next = { ...r, ...patch };
          if (patch.employeeId && !r.id && !r.outTime && isToday) next.outTime = toTimeInput(new Date());
          if (patch.locationId && !next.purposeId) next.purposeId = locations.find((l) => l.id === patch.locationId)?.defaultPurposeId ?? "";
          return next;
        }),
      ),
    );
    setSavedKeys((s) => {
      if (!s.has(key)) return s;
      const n = new Set(s);
      n.delete(key);
      return n;
    });
    setErrors((e) => {
      if (!e[key]) return e;
      const rest = { ...e };
      delete rest[key];
      return rest;
    });
  };

  const duplicate = (row: GridRow) => {
    const copy: GridRow = { ...row, key: newKey(), id: undefined, original: undefined, savedStatus: undefined, inNextDay: false, employeeId: "", outTime: "", inTime: "" };
    setRows((rs) => {
      const i = rs.findIndex((r) => r.key === row.key);
      return pad([...rs.slice(0, i + 1), copy, ...rs.slice(i + 1)]);
    });
  };

  const removeLocal = (row: GridRow) => setRows((rs) => pad(rs.filter((r) => r.key !== row.key)));

  const goDate = (next: DateKey) => {
    if (next > today) return;
    if (hasUnsaved && !window.confirm("Some rows are incomplete or still saving. Leave this date anyway?")) return;
    router.push(`/new-entry?date=${next}`);
  };

  const doMarkIn = async (row: GridRow) => {
    setMarking(row.key);
    const r = await markIn(row.id!);
    setMarking(null);
    if (r.ok) entrySuccess(r.message);
    else toast.error(r.error);
  };

  const discardUnsaved = () => {
    if (!dirtyRows.length) return;
    if (!window.confirm("Discard rows that are not saved yet?")) return;
    setRows(build(entries));
    setErrors({});
  };

  const createLocation = async (name: string) => {
    const r = await quickCreateLocation(name);
    if (!r.ok) {
      toast.error(r.error);
      return null;
    }
    setExtraLocations((x) => [...x, { id: r.id, name: r.name, area: null, defaultPurposeId: null, active: true }]);
    toast.success(`New location “${r.name}” added to master.`);
    return r.id;
  };

  const createPurpose = async (name: string) => {
    const r = await quickCreatePurpose(name);
    if (!r.ok) {
      toast.error(r.error);
      return null;
    }
    setExtraPurposes((x) => [...x, { id: r.id, name: r.name, active: true }]);
    toast.success(`New purpose “${r.name}” added to master.`);
    return r.id;
  };

  const rowSaveState = (r: GridRow) =>
    savingKeys.has(r.key) ? "saving" : errors[r.key] ? "error" : isDirty(r) && !isBlank(r) ? "unsaved" : savedKeys.has(r.key) ? "saved" : null;

  /** Field set shared by the desktop row and the mobile card. */
  const fields = (row: GridRow) => {
    const locked = !!row.id && !canEditAll && !(row.savedStatus === "OUTSIDE" && isToday);
    const err = errors[row.key];
    const blank = isBlank(row);
    const invalidTime = rowState(row) === "invalid";
    const needs = !blank && isDirty(row);
    return {
      employee: (
        <Typeahead
          ariaLabel="Employee"
          value={row.employeeId}
          onChange={(v) => update(row.key, { employeeId: v })}
          options={opt.employees(row.employeeId)}
          placeholder="Type employee"
          disabled={locked}
          invalid={(!!err || needs) && !row.employeeId}
        />
      ),
      location: (
        <Typeahead
          ariaLabel="Location"
          value={row.locationId}
          onChange={(v) => update(row.key, { locationId: v })}
          options={opt.locations(row.locationId)}
          placeholder="Type location"
          onCreate={createLocation}
          disabled={locked}
          invalid={(!!err || needs) && !row.locationId}
        />
      ),
      purpose: (
        <Typeahead
          ariaLabel="Purpose"
          value={row.purposeId}
          onChange={(v) => update(row.key, { purposeId: v })}
          options={opt.purposes(row.purposeId)}
          placeholder={blank ? "Type purpose" : "-"}
          onCreate={createPurpose}
          disabled={locked}
        />
      ),
      authorizedBy: (
        <Typeahead
          ariaLabel="Authorized By"
          value={row.authorizedById || (blank ? "" : NIL)}
          onChange={(v) => update(row.key, { authorizedById: v === NIL ? "" : v })}
          options={opt.authorizers(row.authorizedById)}
          placeholder="NIL"
          disabled={locked}
        />
      ),
      out: <TimeText label="OUT time" value={row.outTime} onChange={(v) => update(row.key, { outTime: v })} disabled={locked} invalid={((!!err || needs) && !row.outTime) || invalidTime} />,
      in: (
        <div className="relative">
          <TimeText label="IN time" value={row.inTime} onChange={(v) => update(row.key, { inTime: v })} disabled={locked || row.inNextDay} invalid={invalidTime} />
          {row.inNextDay && <span className="absolute -top-2 right-1 rounded bg-amber-100 px-1 text-[10px] font-medium text-amber-700">+1 day</span>}
        </div>
      ),
      actions: (
        <div className="flex items-center justify-end gap-1.5">
          {row.id && row.savedStatus === "OUTSIDE" && !row.inTime ? (
            <Button size="sm" className="h-8 gap-1 px-3" onClick={() => void doMarkIn(row)} disabled={marking === row.key}>
              {marking === row.key ? <Loader2 className="animate-spin" /> : <Send />}
              Mark IN
            </Button>
          ) : (
            !blank &&
            canCreate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" tabIndex={-1} onClick={() => duplicate(row)} className="flex size-8 items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50" aria-label="Duplicate row">
                    <Copy className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Duplicate (same location &amp; purpose)</TooltipContent>
              </Tooltip>
            )
          )}
          {(row.id ? canDelete : canCreate) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() =>
                    row.id
                      ? setVoiding({ id: row.id, label: `${empName.get(row.employeeId)} · ${locName.get(row.locationId) ?? ""} · OUT ${row.outTime}` })
                      : removeLocal(row)
                  }
                  className="flex size-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                  aria-label="Delete row"
                >
                  <Trash2 className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{row.id ? "Delete entry" : "Remove row"}</TooltipContent>
            </Tooltip>
          )}
        </div>
      ),
      error: err,
    };
  };

  const statusLine = busy ? (
    <span className="flex items-center gap-2 text-sm text-primary">
      <Loader2 className="size-4 animate-spin" /> Saving…
    </span>
  ) : errorCount ? (
    <span className="flex items-center gap-2 text-sm font-medium text-destructive">
      <AlertCircle className="size-4" /> {errorCount} {errorCount === 1 ? "row needs" : "rows need"} fixing
    </span>
  ) : incomplete ? (
    <span className="flex items-center gap-2 text-sm text-amber-600">
      <span className="size-2 rounded-full bg-amber-500" /> {incomplete} incomplete — needs Employee, Location &amp; OUT time
    </span>
  ) : (
    <span className="flex items-center gap-2 text-sm text-emerald-700">
      <CloudCheck className="size-4" /> All changes saved automatically
    </span>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-[28px]">New Movement Entry</h2>
        <p className="mt-1 text-sm text-muted-foreground">Type and press Tab to move ahead. Each row saves automatically once Employee, Location and OUT time are filled.</p>
      </div>

      {(showPending || pending.length > 0) && <PendingInStrip items={pending} className={cn(!showPending && "md:hidden")} />}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_repeat(3,minmax(0,1fr))]">
        <div className="rounded-xl border bg-card p-4">
          <label htmlFor="entry-date" className="mb-1.5 block text-sm font-semibold">
            Date <span className="text-destructive">*</span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[170px] flex-1">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="entry-date"
                type="date"
                value={date}
                max={today}
                onChange={(e) => e.target.value && goDate(e.target.value)}
                className="tabular h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </div>
            <Button className="h-10 px-5" onClick={() => goDate(today)} disabled={isToday}>
              Today
            </Button>
            <Button variant="outline" size="icon-lg" className="size-10" onClick={() => goDate(addDaysToKey(date, -1))} aria-label="Previous day">
              <ChevronLeft />
            </Button>
            <Button variant="outline" size="icon-lg" className="size-10" onClick={() => goDate(addDaysToKey(date, 1))} disabled={isToday} aria-label="Next day">
              <ChevronRight />
            </Button>
          </div>
        </div>
        <StatCard icon={Users} tone="blue" label="Total Entries" value={active.length} />
        <StatCard icon={CheckCircle2} tone="green" label="Completed" value={completed.length} />
        <StatCard icon={Timer} tone="purple" label="Total Duration" value={formatDuration(totalMinutes)} />
      </div>

      {/* Desktop grid */}
      <div className="hidden rounded-2xl border bg-card md:block">
        <div className="overflow-x-auto p-3">
          <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left [&>th]:h-11 [&>th]:bg-muted/70 [&>th]:px-2 [&>th]:font-semibold [&>th]:whitespace-nowrap">
                <th className="w-12 rounded-l-lg pl-3!">#</th>
                <th className="w-[13%]">
                  Employee <span className="text-destructive">*</span>
                </th>
                <th className="w-[17%]">
                  Location / Place <span className="text-destructive">*</span>
                </th>
                <th className="w-[13%]">Purpose</th>
                <th className="w-[12%]">Authorized By</th>
                <th className="w-[10%]">
                  OUT Time <span className="text-destructive">*</span>
                </th>
                <th className="w-[10%]">IN Time</th>
                <th className="w-[8%] text-center">Duration</th>
                <th className="w-[9%] text-center">Status</th>
                <th className="w-[110px] rounded-r-lg pr-3! text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row, i) => {
                const f = fields(row);
                return (
                  <tr
                    key={row.key}
                    data-row-key={row.key}
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setTimeout(() => void flush(row.key), 0);
                    }}
                    className={cn("[&>td]:border-b [&>td]:px-2 [&>td]:py-1.5", f.error && "[&>td]:bg-red-50/60")}
                  >
                    <td className="pl-3!">
                      <div className="tabular flex items-center gap-1.5 font-medium text-muted-foreground">
                        {i + 1}
                        <SaveDot state={rowSaveState(row)} />
                      </div>
                    </td>
                    <td>{f.employee}</td>
                    <td>
                      {f.location}
                      {f.error && <p className="mt-1 text-xs font-medium text-destructive">{f.error}</p>}
                    </td>
                    <td>{f.purpose}</td>
                    <td>{f.authorizedBy}</td>
                    <td>{f.out}</td>
                    <td>{f.in}</td>
                    <td>
                      <DurationBadge row={row} />
                    </td>
                    <td>
                      <StatusCell row={row} />
                    </td>
                    <td className="pr-3!">{f.actions}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t p-3">
          {canCreate && (
            <Button variant="secondary" className="h-11 bg-blue-50 px-5 text-primary hover:bg-blue-100" onClick={() => setRows((rs) => [...rs, blankRow()])}>
              <Plus /> Add Row
            </Button>
          )}
          <div className="ml-auto flex items-center gap-4">
            {statusLine}
            {dirtyRows.length > 0 && !busy && (
              <Button variant="outline" className="h-11 px-5" onClick={discardUnsaved}>
                <RotateCcw /> Discard Unsaved
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {shown
          .filter((r, i, all) => !isBlank(r) || all.findIndex(isBlank) === i)
          .map((row) => {
            const f = fields(row);
            const blank = isBlank(row);
            return (
              <div
                key={row.key}
                data-row-key={row.key}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setTimeout(() => void flush(row.key), 0);
                }}
                className={cn("space-y-2.5 rounded-2xl border bg-card p-3", f.error && "border-red-300 bg-red-50/40", blank && "border-dashed")}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {blank ? "New OUT entry" : (empName.get(row.employeeId) ?? "Entry")}
                    <SaveDot state={rowSaveState(row)} />
                  </span>
                  {!blank && <StatusCell row={row} />}
                </div>
                {f.employee}
                {f.location}
                <div className="grid grid-cols-2 gap-2">
                  {f.purpose}
                  {f.authorizedBy}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">OUT Time *</div>
                    {f.out}
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">IN Time</div>
                    {f.in}
                  </div>
                </div>
                {f.error && <p className="text-xs font-medium text-destructive">{f.error}</p>}
                {!blank && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-28">
                      <DurationBadge row={row} />
                    </div>
                    {f.actions}
                  </div>
                )}
              </div>
            );
          })}
        <div className="sticky bottom-[76px] z-20 flex items-center gap-2 rounded-2xl border bg-card/95 p-2 shadow-lg backdrop-blur">
          {canCreate && (
            <Button variant="outline" className="h-12 px-4" onClick={() => setRows((rs) => [...rs, blankRow()])}>
              <Plus /> Add
            </Button>
          )}
          <div className="min-w-0 flex-1 px-1">{statusLine}</div>
        </div>
      </div>

      <VoidDialog target={voiding} onClose={() => setVoiding(null)} />
    </div>
  );
}
