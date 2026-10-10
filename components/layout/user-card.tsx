import { LogOut } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import type { SessionUser } from "@/lib/auth-guard";
import { roleTitle } from "@/lib/roles";

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function SidebarUserCard({ user }: { user: SessionUser }) {
  return (
    <div className="relative border-t border-sidebar-border pt-4">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary text-base font-semibold text-white">
          {initials(user.name)}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-medium text-white">{user.name}</div>
          <div className="text-xs text-sidebar-foreground/70">{roleTitle(user.role)}</div>
        </div>
      </div>
      <form action={logoutAction}>
        <button
          type="submit"
          className="mt-1 flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-white"
        >
          <LogOut className="size-[18px]" />
          Logout
        </button>
      </form>
    </div>
  );
}
