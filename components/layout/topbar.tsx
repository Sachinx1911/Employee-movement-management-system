"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/lib/actions/auth";
import type { SessionUser } from "@/lib/auth-guard";
import { navFor, titleForPath } from "@/lib/navigation";
import { AttentionBell, type BellItem } from "./attention-bell";
import { GlobalSearch } from "./global-search";
import { LiveClock } from "./live-clock";
import { roleTitle } from "@/lib/roles";

export function Topbar({
  user,
  now,
  attention,
  attentionEnabled,
  menu,
}: {
  user: SessionUser;
  now: number;
  attention: BellItem[];
  attentionEnabled: boolean;
  menu: ReactNode;
}) {
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";

  return (
    <header className="no-print sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur sm:px-6">
      {menu}
      {isDashboard && user.permissions.includes("search.global") ? (
        <GlobalSearch className="hidden w-full max-w-xs md:block" />
      ) : (
        <div className="flex min-w-0 items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-primary" />
          <span className="truncate text-[15px] font-semibold">{titleForPath(pathname)}</span>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <div className="hidden xl:block">
          <LiveClock initial={now} />
        </div>

        <AttentionBell items={attention} enabled={attentionEnabled} />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <span className="hidden text-sm font-medium sm:block">{user.name}</span>
            <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <div className="text-sm font-medium">{user.name}</div>
              <div className="text-xs font-normal text-muted-foreground">
                @{user.username} · {roleTitle(user.role)}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {navFor(user.permissions).some((i) => i.href === "/settings") && (
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="size-4" /> Settings
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <form action={logoutAction} className="w-full">
                <button type="submit" className="flex w-full items-center gap-2 text-destructive">
                  <LogOut className="size-4" /> Logout
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
