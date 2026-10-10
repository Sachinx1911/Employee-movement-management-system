import type { Metadata } from "next";
import { SettingsView, type SettingsTab } from "@/components/settings/settings-view";
import { can, getRolePermissions, requirePermission } from "@/lib/auth-guard";
import { SETTINGS_PERMISSIONS, settingsTabAllowed } from "@/lib/permissions";
import { AUDIT_PAGE, getAppSettings, getLogo, listAudit, listUsers } from "@/lib/queries/settings";
import { isSuperAdmin } from "@/lib/roles";

export const metadata: Metadata = { title: "Settings" };

const TABS: SettingsTab[] = ["general", "hours", "notifications", "backup", "users", "permissions", "appearance", "security"];

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const me = await requirePermission(...SETTINGS_PERMISSIONS);
  const sp = await searchParams;
  const rawTab = sp.tab === "audit" ? "security" : sp.tab;
  const allowed = TABS.filter((t) => settingsTabAllowed(t, me.permissions, me.role));
  const tab = allowed.includes(rawTab as SettingsTab) ? (rawTab as SettingsTab) : allowed[0]!;
  const page = Math.max(1, Math.floor(Number(sp.page) || 1));

  // Only load what this user is allowed to see.
  const [settings, logo, users, audit, rolePermissions] = await Promise.all([
    getAppSettings(),
    getLogo(),
    can(me, "users.manage") ? listUsers(me.role) : [],
    can(me, "audit.view") ? listAudit(page, me.role) : { total: 0, rows: [] },
    isSuperAdmin(me.role) ? getRolePermissions() : null,
  ]);

  return (
    <SettingsView
      key={tab}
      tab={tab}
      settings={settings}
      logo={logo}
      smtpConfigured={!!process.env.SMTP_HOST}
      users={users}
      meId={me.id}
      meRole={me.role}
      permissions={me.permissions}
      rolePermissions={rolePermissions}
      audit={{ rows: audit.rows, page, total: audit.total, pageSize: AUDIT_PAGE }}
    />
  );
}
