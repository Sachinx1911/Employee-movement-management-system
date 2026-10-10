// Roles, lowest to highest. SUPER_ADMIN can do everything an ADMIN can, and is
// the only role that can see or manage SUPER_ADMIN users, the activity of
// super admins and full backups. ADMINs never see anything about super admins.

export type Role = "SUPER_ADMIN" | "ADMIN" | "STAFF";

export const isAdmin = (role: Role | null | undefined) => role === "ADMIN" || role === "SUPER_ADMIN";
export const isSuperAdmin = (role: Role | null | undefined) => role === "SUPER_ADMIN";

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  STAFF: "Staff",
};

/** Long form for the user menu / sidebar card. */
export const roleTitle = (role: Role) => (role === "SUPER_ADMIN" ? "Super Administrator" : role === "ADMIN" ? "Administrator" : "Staff");
