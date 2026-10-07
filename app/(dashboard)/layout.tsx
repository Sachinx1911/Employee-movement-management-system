import { Suspense } from "react";
import { Brand, SidebarSkyline } from "@/components/layout/brand";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Topbar } from "@/components/layout/topbar";
import { SidebarUserCard } from "@/components/layout/user-card";
import { requireUser } from "@/lib/auth-guard";
import { ClientPrefs } from "@/components/layout/client-prefs";
import { getAttention } from "@/lib/queries/attention";
import { nowMs } from "@/lib/date-utils";
import { getAppSettings, getLogo } from "@/lib/queries/settings";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const [attention, settings, logo] = await Promise.all([getAttention(), getAppSettings(), getLogo()]);
  const footer = <SidebarUserCard user={user} />;
  const brand = <Brand name={settings.company.name} logo={logo} />;

  return (
    <div className="min-h-dvh">
      <ClientPrefs showSuccessToast={settings.app.showSuccessToast} />
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-[250px] flex-col overflow-hidden bg-sidebar p-4 lg:flex">
        <SidebarSkyline />
        <div className="relative px-2 pb-6 pt-1">{brand}</div>
        <div className="relative flex-1 overflow-y-auto">
          <Suspense>
            <SidebarNav role={user.role} />
          </Suspense>
        </div>
        {footer}
      </aside>

      <div className="flex min-h-dvh flex-col lg:pl-[250px] print:pl-0">
        <Topbar
          user={user}
          now={nowMs()}
          attention={attention}
          attentionEnabled={settings.notifications.entryReminders}
          menu={<MobileDrawer role={user.role} footer={footer} brand={brand} />}
        />
        <main className="flex-1 px-4 pb-28 pt-5 sm:px-6 lg:pb-10 print:p-0">{children}</main>
      </div>

      <Suspense>
        <MobileBottomNav />
      </Suspense>
    </div>
  );
}
