import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isAdmin, type Role } from "@/lib/roles";

export type SessionUser = { id: string; name: string; username: string; role: Role };

/**
 * The signed-in user, re-checked against the database on every request:
 * a deactivated user, a changed/reset password or a role change ends older
 * sessions immediately, and the role always comes from the database.
 */
const currentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, name: true, username: true, role: true, active: true, sessionVersion: true },
  });
  if (!user || !user.active || user.sessionVersion !== (session.user.sessionVersion ?? 0)) return null;
  return { id: user.id, name: user.name, username: user.username, role: user.role };
});

/** For pages: returns the signed-in user, or ends the session and goes to /login. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  const user = await currentUser();
  if (!user) redirect(session?.user ? "/session-ended" : "/login");
  return user;
}

/** For admin-only pages: redirects staff back to the dashboard. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isAdmin(user.role)) redirect("/dashboard");
  return user;
}

export class AuthError extends Error {}

/** For server actions: throws instead of redirecting. */
export async function getActionUser(opts: { admin?: boolean } = {}): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new AuthError("Your session has ended. Please log in again.");
  if (opts.admin && !isAdmin(user.role)) throw new AuthError("Only an admin can perform this action.");
  return user;
}
