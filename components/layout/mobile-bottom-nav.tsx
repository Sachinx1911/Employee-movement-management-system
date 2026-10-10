"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MOBILE_NAV, navFor } from "@/lib/navigation";
import type { Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export function MobileBottomNav({ permissions }: { permissions: Permission[] }) {
  const items = navFor(permissions, MOBILE_NAV);
  const pathname = usePathname();
  const tab = useSearchParams().get("tab");
  const current = pathname + (tab ? `?tab=${tab}` : "");

  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const active = current === item.href || (item.href === pathname && !tab);
          const Icon = item.icon;
          const primary = item.label === "OUT";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              {primary ? (
                <span className="-mt-5 flex size-12 items-center justify-center rounded-full bg-primary text-white shadow-lg ring-4 ring-background">
                  <Icon className="size-5" />
                </span>
              ) : (
                <Icon className="size-5" />
              )}
              <span className={cn(primary && "font-semibold text-primary")}>{primary ? "+ OUT" : item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
