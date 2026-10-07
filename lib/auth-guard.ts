import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type SessionUser = { id: string; name: string; username: string; role: "ADMIN" | "STAFF" };

/** For pages: returns the signed-in user or redirects to /login. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id, name, username, role } = session.user;
  return { id, name: name ?? username, username, role };
}

/** For admin-only pages: redirects staff back to the dashboard. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

export class AuthError extends Error {}

/** For server actions: throws instead of redirecting. */
export async function getActionUser(opts: { admin?: boolean } = {}): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) throw new AuthError("Your session has expired. Please log in again.");
  const { id, name, username, role } = session.user;
  if (opts.admin && role !== "ADMIN") throw new AuthError("Only an admin can perform this action.");
  return { id, name: name ?? username, username, role };
}
