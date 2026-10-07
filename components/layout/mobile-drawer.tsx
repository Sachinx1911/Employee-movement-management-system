"use client";

import { Suspense, useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "./sidebar-nav";

export function MobileDrawer({ role, footer, brand }: { role: "ADMIN" | "STAFF"; footer: ReactNode; brand: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="lg:hidden" aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[270px] border-none bg-sidebar p-4 text-sidebar-foreground">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="flex h-full flex-col">
          <div className="px-2 pb-6 pt-2">
            {brand}
          </div>
          <div className="flex-1 overflow-y-auto">
            <Suspense>
              <SidebarNav role={role} onNavigate={() => setOpen(false)} />
            </Suspense>
          </div>
          {footer}
        </div>
      </SheetContent>
    </Sheet>
  );
}
