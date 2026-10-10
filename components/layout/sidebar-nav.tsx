"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { navFor, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import type { Permission } from "@/lib/permissions";

const itemClass = (active: boolean) =>
  cn(
    "flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition-colors",
    active
      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  );

function Group({ item, pathname, tab, onNavigate }: { item: NavItem; pathname: string; tab: string | null; onNavigate?: () => void }) {
  const inSection = pathname.startsWith(item.href);
  const [open, setOpen] = useState(inSection);
  const Icon = item.icon;
  const expanded = open || inSection;

  return (
    <div>
      <button type="button" onClick={() => setOpen(!expanded)} aria-expanded={expanded} className={cn(itemClass(false), "w-full", inSection && "text-white")}>
        <Icon className="size-[18px]" />
        {item.label}
        <ChevronDown className={cn("ml-auto size-4 transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded && (
        <div className="mt-1 space-y-1 pl-4">
          {item.children!.map((child) => {
            const childTab = new URL(child.href, "http://x").searchParams.get("tab");
            const active = inSection && (tab ?? "employees") === childTab;
            const ChildIcon = child.icon;
            return (
              <Link key={child.href} href={child.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn(itemClass(active), "h-10 text-sm")}>
                <ChildIcon className="size-4" />
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SidebarNav({ permissions, onNavigate }: { permissions: Permission[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const tab = useSearchParams().get("tab");
  return (
    <nav className="flex flex-col gap-1">
      {navFor(permissions).map((item) => {
        if (item.children) return <Group key={item.href} item={item} pathname={pathname} tab={tab} onNavigate={onNavigate} />;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={itemClass(active)}>
            <Icon className="size-[18px]" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
