import type { Metadata } from "next";
import { SettingsView, type SettingsTab } from "@/components/settings/settings-view";
import { requireAdmin } from "@/lib/auth-guard";
import { AUDIT_PAGE, getAppSettings, getLogo, listAudit, listUsers } from "@/lib/queries/settings";

export const metadata: Metadata = { title: "Settings" };

const TABS: SettingsTab[] = ["general", "hours", "notifications", "backup", "users", "appearance", "security"];

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const rawTab = sp.tab === "audit" ? "security" : sp.tab;
  const tab = TABS.includes(rawTab as SettingsTab) ? (rawTab as SettingsTab) : "general";
  const page = Math.max(1, Math.floor(Number(sp.page) || 1));

  const [settings, logo, users, audit] = await Promise.all([getAppSettings(), getLogo(), listUsers(), listAudit(page)]);

  return (
    <SettingsView
      key={tab}
      tab={tab}
      settings={settings}
      logo={logo}
      smtpConfigured={!!process.env.SMTP_HOST}
      users={users}
      meId={me.id}
      audit={{ rows: audit.rows, page, total: audit.total, pageSize: AUDIT_PAGE }}
    />
  );
}
