"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

function pageWindow(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pages - 1, page + 1);
  if (start > 2) out.push("…");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < pages - 1) out.push("…");
  out.push(pages);
  return out;
}

export function PaginationBar({
  page,
  perPage,
  total,
  noun,
  pageSizes,
  onPage,
  onPerPage,
  compact = false,
}: {
  page: number;
  perPage: number;
  total: number;
  noun: string;
  pageSizes?: readonly number[];
  onPage: (page: number) => void;
  onPerPage?: (perPage: number) => void;
  compact?: boolean;
}) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", compact ? "px-1 pt-3" : "border-t px-4 py-4")}>
      <p className="text-sm text-muted-foreground">
        Showing {from} to {to} of {total} {noun}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size={compact ? "icon" : "icon-lg"} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft />
        </Button>
        {pageWindow(page, pages).map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size={compact ? "icon" : "icon-lg"}
              onClick={() => onPage(p)}
              aria-current={p === page ? "page" : undefined}
              className={cn("tabular", p === page && "pointer-events-none")}
            >
              {p}
            </Button>
          ),
        )}
        <Button variant="outline" size={compact ? "icon" : "icon-lg"} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight />
        </Button>
        {pageSizes && onPerPage && (
        <Select value={String(perPage)} onValueChange={(v) => onPerPage(Number(v))}>
          <SelectTrigger className="ml-1 h-9 w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizes.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s} per page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        )}
      </div>
    </div>
  );
}
