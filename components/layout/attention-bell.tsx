"use client";

import Link from "next/link";
import { Bell, CircleCheck } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type BellItem = { id: string; level: "critical" | "warning"; title: string; detail: string; href: string };

export function AttentionBell({ items, enabled }: { items: BellItem[]; enabled: boolean }) {
  const critical = items.filter((i) => i.level === "critical").length;
  const count = enabled ? items.length : 0;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative flex size-9 items-center justify-center rounded-lg text-foreground/80 outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`${count} items need attention`}
      >
        <Bell className="size-5" />
        {count > 0 && (
          <span
            className={cn(
              "absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white ring-2 ring-card",
              critical ? "bg-destructive" : "bg-amber-500",
            )}
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[340px] p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2.5">
          <span className="font-semibold">Attention Required</span>
          <span className="text-xs font-normal text-muted-foreground">{items.length} item{items.length === 1 ? "" : "s"}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground">
            <CircleCheck className="size-6 text-emerald-600" />
            Everything looks good.
          </div>
        ) : (
          <div className="max-h-[360px] overflow-y-auto p-1">
            {items.map((i) => (
              <DropdownMenuItem key={i.id} asChild className="items-start gap-2.5 rounded-md px-2.5 py-2">
                <Link href={i.href}>
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", i.level === "critical" ? "bg-destructive" : "bg-amber-500")} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium leading-snug">{i.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{i.detail}</span>
                  </span>
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
