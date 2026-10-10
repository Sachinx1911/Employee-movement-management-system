// Every access in the app that the Super Admin can switch on/off per role.
// SUPER_ADMIN always has all of them; "Roles & Permissions" itself is fixed to
// SUPER_ADMIN and is not in this list. Defaults match how the app behaved
// before permissions were configurable.

import type { Role } from "@/lib/roles";

export type EditableRole = Exclude<Role, "SUPER_ADMIN">;
export const EDITABLE_ROLES: EditableRole[] = ["ADMIN", "STAFF"];

export const PERMISSION_GROUPS = [
  {
    group: "Movement Entries",
    items: [
      { key: "entries.create", label: "Create OUT entries", hint: "Open New Entry and add new OUT entries." },
      { key: "entries.markIn", label: "Mark IN", hint: "Set the IN time of employees who are outside." },
      { key: "entries.editAll", label: "Edit any entry", hint: "Edit completed and older entries (without this, only today's entries that are still outside)." },
      { key: "entries.delete", label: "Delete entries", hint: "Delete a movement entry (with a reason)." },
      { key: "masters.quickAdd", label: "Add new location / purpose while typing", hint: "A new location or purpose typed in New Entry is created automatically." },
    ],
  },
  {
    group: "Reports",
    items: [
      { key: "reports.daily", label: "Daily Report", hint: "View the daily report, WhatsApp text and PDF / Excel / CSV export." },
      { key: "reports.dailyOptions", label: "Change default report options", hint: "Save the Daily Report options for everyone." },
      { key: "reports.monthly", label: "Monthly Report", hint: "View the monthly report, employee detail and all exports." },
      { key: "search.global", label: "Global search", hint: "Search employees and master data from the top bar." },
    ],
  },
  {
    group: "Master Data",
    items: [
      { key: "masters.employees", label: "Employees", hint: "View, add, edit, deactivate and delete employees and departments." },
      { key: "masters.locations", label: "Locations", hint: "View, add, edit, deactivate and delete locations." },
      { key: "masters.purposes", label: "Purpose", hint: "View, add, edit, deactivate and delete purposes." },
      { key: "masters.authorizers", label: "Authorized By", hint: "View, add, edit, deactivate and delete authorized persons." },
    ],
  },
  {
    group: "Settings & Security",
    items: [
      { key: "settings.manage", label: "Application settings", hint: "General, working hours, notifications, appearance, logo and data settings." },
      { key: "users.manage", label: "Users & Access", hint: "Add users, change roles, reset passwords, activate / deactivate (never super admins)." },
      { key: "audit.view", label: "Audit log", hint: "See who created, edited, marked IN, deleted and logged in." },
      { key: "backup.download", label: "Download full backup", hint: "Download a JSON backup of all records." },
    ],
  },
] as const;

export type Permission = (typeof PERMISSION_GROUPS)[number]["items"][number]["key"];
export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key));

export type RolePermissions = Record<EditableRole, Permission[]>;

export const DEFAULT_ROLE_PERMISSIONS: RolePermissions = {
  ADMIN: ALL_PERMISSIONS.filter((p) => p !== "backup.download"),
  STAFF: ["entries.create", "entries.markIn", "masters.quickAdd", "reports.daily"],
};

/** Accepts whatever is stored; unknown keys are dropped, missing roles fall back to defaults. */
export function normalizeRolePermissions(raw: unknown): RolePermissions {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pick = (role: EditableRole) => {
    const list = src[role];
    if (!Array.isArray(list)) return DEFAULT_ROLE_PERMISSIONS[role];
    return ALL_PERMISSIONS.filter((p) => list.includes(p));
  };
  return { ADMIN: pick("ADMIN"), STAFF: pick("STAFF") };
}

/** Permissions of a role. Super admin: everything. */
export function permissionsFor(role: Role, config: RolePermissions): Permission[] {
  return role === "SUPER_ADMIN" ? ALL_PERMISSIONS : config[role];
}

export const MASTER_PERMISSION = {
  employees: "masters.employees",
  locations: "masters.locations",
  purposes: "masters.purposes",
  authorizers: "masters.authorizers",
} as const satisfies Record<string, Permission>;

/** Settings page is reachable with any of these. */
export const SETTINGS_PERMISSIONS: Permission[] = ["settings.manage", "users.manage", "audit.view", "backup.download"];

/** Which Settings tabs a user can open. "security" (own password) is open to everyone who reaches Settings. */
export function settingsTabAllowed(id: string, permissions: Permission[], role: Role) {
  if (id === "permissions") return role === "SUPER_ADMIN";
  if (id === "users") return permissions.includes("users.manage");
  if (id === "security") return true;
  if (id === "backup") return permissions.includes("settings.manage") || permissions.includes("backup.download");
  return permissions.includes("settings.manage");
}
