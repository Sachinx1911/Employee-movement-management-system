import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { normalizeRolePermissions, permissionsFor, type Permission, type RolePermissions } from "@/lib/permissions";
import { isSuperAdmin, type Role } from "@/lib/roles";

export type SessionUser = { id: string; name: string; username: string; role: Role; permissions: Permission[] };

/** Role → permissions as configured by the super admin (Settings → Roles & Permissions). */
export const getRolePermissions = cache(async (): Promise<RolePermissions> => {
  const row = await db.setting.findUnique({ where: { key: "permissions" } });
  return normalizeRolePermissions(row?.value);
});

/**
 * The signed-in user, re-checked against the database on every request:
 * a deactivated user, a changed/reset password or a role change ends older
 * sessions immediately, and the role and permissions always come from the database.
 */
const currentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const [user, config] = await Promise.all([
    db.user.findUnique({
      where: { id },
      select: { id: true, name: true, username: true, role: true, active: true, sessionVersion: true },
    }),
    getRolePermissions(),
  ]);
  if (!user || !user.active || user.sessionVersion !== (session.user.sessionVersion ?? 0)) return null;
  return { id: user.id, name: user.name, username: user.username, role: user.role, permissions: permissionsFor(user.role, config) };
});

export const can = (user: Pick<SessionUser, "permissions">, ...anyOf: Permission[]) => anyOf.some((p) => user.permissions.includes(p));

/** For pages: returns the signed-in user, or ends the session and goes to /login. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  const user = await currentUser();
  if (!user) redirect(session?.user ? "/session-ended" : "/login");
  return user;
}

/** For pages: the user needs at least one of the permissions, otherwise back to the dashboard. */
export async function requirePermission(...anyOf: Permission[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user, ...anyOf)) redirect("/dashboard");
  return user;
}

/** For super-admin-only pages. */
export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isSuperAdmin(user.role)) redirect("/dashboard");
  return user;
}

export class AuthError extends Error {}

/** For server actions and API routes: throws instead of redirecting. */
export async function getActionUser(opts: { perm?: Permission | Permission[]; superAdmin?: boolean } = {}): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new AuthError("Your session has ended. Please log in again.");
  if (opts.superAdmin && !isSuperAdmin(user.role)) throw new AuthError("Only the super admin can do this.");
  if (opts.perm) {
    const list = Array.isArray(opts.perm) ? opts.perm : [opts.perm];
    if (!can(user, ...list)) throw new AuthError("You do not have permission to do this.");
  }
  return user;
}
