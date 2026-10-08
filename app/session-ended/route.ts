import { signOut } from "@/auth";

/**
 * Clears a session that is no longer valid (user deactivated, password changed,
 * role changed) and sends the browser to the login page. Route handlers can
 * delete cookies; pages cannot, which is why this lives here.
 */
export async function GET() {
  await signOut({ redirect: false });
  return new Response(null, { status: 303, headers: { Location: "/login?ended=1", "Cache-Control": "no-store" } });
}
