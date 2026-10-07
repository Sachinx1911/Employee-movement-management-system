"use client";

import { FileBadge, Loader2, MapPin, Search, UserCheck, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { searchAll, type SearchHit } from "@/lib/actions/search";
import { cn } from "@/lib/utils";

const ICON = { employees: Users, locations: MapPin, purposes: FileBadge, authorizers: UserCheck };
const LABEL = { employees: "Employee", locations: "Location", purposes: "Purpose", authorizers: "Authorized By" };

export function GlobalSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(() => start(async () => setHits(await searchAll(q))), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const results = q.trim().length >= 2 ? hits : null;

  const go = (hit: SearchHit) => {
    setOpen(false);
    setQ("");
    setHits(null);
    router.push(`/master-data?tab=${hit.type}&q=${encodeURIComponent(hit.title)}`);
  };

  return (
    <div ref={box} className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!results?.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            go(results[active]!);
          } else if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Search here..."
        aria-label="Search employees, locations, purposes"
        className="h-9 w-full rounded-lg border bg-background pl-9 pr-8 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/50"
      />
      {pending && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}

      {open && results && (
        <div className="absolute left-0 right-0 top-11 z-50 max-h-[360px] overflow-y-auto rounded-xl border bg-popover p-1 shadow-lg">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No results for “{q.trim()}”</p>
          ) : (
            results.map((hit, i) => {
              const Icon = ICON[hit.type];
              return (
                <button
                  key={`${hit.type}-${hit.id}`}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(hit)}
                  className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left", i === active && "bg-muted")}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{hit.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{hit.subtitle}</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground">{LABEL[hit.type]}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
