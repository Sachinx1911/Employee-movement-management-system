"use client";

import { Pencil, Plus, Search, Trash2, type LucideIcon } from "lucide-react";
import { useMemo, useState, type ReactNode, type Ref } from "react";
import { StatusBadge } from "@/components/shared/badges";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type MasterTone = "blue" | "green" | "purple" | "orange";

const TONE: Record<MasterTone, { band: string; tile: string; accent: string; button: string }> = {
  blue: { band: "bg-blue-50/80", tile: "bg-blue-100 text-blue-600", accent: "text-blue-600", button: "bg-blue-600 hover:bg-blue-700" },
  green: { band: "bg-emerald-50/80", tile: "bg-emerald-500 text-white", accent: "text-emerald-600", button: "bg-emerald-600 hover:bg-emerald-700" },
  purple: { band: "bg-violet-50/80", tile: "bg-violet-500 text-white", accent: "text-violet-600", button: "bg-violet-600 hover:bg-violet-700" },
  orange: { band: "bg-orange-50/80", tile: "bg-orange-100 text-orange-500", accent: "text-orange-500", button: "bg-orange-500 hover:bg-orange-600" },
};

export type Column<T> = { header: string; cell: (row: T) => ReactNode; className?: string };

type Props<T extends { id: string; active: boolean }> = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  countIcon: LucideIcon;
  tone: MasterTone;
  countLabel: string;
  noun: string;
  addLabel: string;
  searchPlaceholder: string;
  rows: T[];
  searchText: (row: T) => string;
  columns: Column<T>[];
  onAdd: () => void;
  onEdit: (row: T) => void;
  onDelete: (row: T) => void;
  className?: string;
  initialQuery?: string;
  ref?: Ref<HTMLElement>;
};

const PER_PAGE = 10;

export function MasterCard<T extends { id: string; active: boolean }>({
    title,
    subtitle,
    icon: Icon,
    countIcon: CountIcon,
    tone,
    countLabel,
    noun,
    addLabel,
    searchPlaceholder,
    rows,
    searchText,
    columns,
    onAdd,
    onEdit,
    onDelete,
    className,
    initialQuery = "",
    ref,
}: Props<T>) {
  const t = TONE[tone];
  const [q, setQ] = useState(initialQuery);
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (status === "all" || r.active === (status === "active")) &&
        (!needle || searchText(r).toLowerCase().includes(needle)),
    );
  }, [rows, q, status, searchText]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  return (
    <section
      ref={ref}
      className={cn(
        "rounded-2xl border bg-card p-3 sm:p-4",
        className,
      )}
    >
      <header className={cn("flex flex-wrap items-center gap-3 rounded-xl p-3 sm:gap-4", t.band)}>
        <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", t.tile)}>
          <Icon className="size-6" strokeWidth={2.2} />
        </div>
        <div className="min-w-[180px] flex-1">
          <h3 className="text-lg font-bold leading-tight">{title}</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <CountIcon className={cn("size-6", t.accent)} />
          <div className="leading-tight">
            <div className="tabular text-xl font-bold">{rows.length}</div>
            <div className="text-xs text-muted-foreground">{countLabel}</div>
          </div>
        </div>
        <Button onClick={onAdd} className={cn("h-9 text-white", t.button)}>
          <Plus /> {addLabel}
        </Button>
      </header>

      <div className="mt-3 flex gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            className="h-9 pl-9"
            aria-label={`Search ${title}`}
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as typeof status);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9! w-[130px]" aria-label={`Filter ${title} by status`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="whitespace-nowrap">
            <tr className="bg-muted/70 text-left [&>th]:h-11 [&>th]:px-3 [&>th]:font-semibold">
              <th className="w-12 rounded-l-lg pl-4!">#</th>
              {columns.map((c) => (
                <th key={c.header}>
                  {c.header}
                </th>
              ))}
              <th className="w-[100px]">Status</th>
              <th className="w-[100px] rounded-r-lg text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 3} className="py-10 text-center text-muted-foreground">
                  {rows.length === 0 ? `No ${noun} added yet.` : `No ${noun} match your search.`}
                </td>
              </tr>
            ) : (
              visible.map((row, i) => (
                <tr key={row.id} className={cn("border-b last:border-b-0 [&>td]:h-12 [&>td]:px-3 [&>td]:whitespace-nowrap", !row.active && "text-muted-foreground")}>
                  <td className="tabular pl-4!">{(current - 1) * PER_PAGE + i + 1}</td>
                  {columns.map((c) => (
                    <td key={c.header}>
                      <div className={c.className}>{c.cell(row)}</div>
                    </td>
                  ))}
                  <td>
                    <StatusBadge kind={row.active ? "active" : "inactive"} />
                  </td>
                  <td>
                    <div className="flex justify-center gap-1.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => onEdit(row)}
                            className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                            aria-label="Edit"
                          >
                            <Pencil className="size-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => onDelete(row)}
                            className="flex size-8 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                            aria-label="Delete or deactivate"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Delete / Deactivate</TooltipContent>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PaginationBar compact page={current} perPage={PER_PAGE} total={filtered.length} noun={noun} onPage={setPage} />
    </section>
  );
}
