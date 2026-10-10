import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/lib/roles";

// Edge-safe part of the Auth.js config (no database access). Used by proxy.ts
// only to send signed-out visitors to /login. Which pages a user may open is
// decided per request from the database (role permissions set by the super
// admin) in lib/auth-guard.ts for every page, server action and API route.

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      if (pathname.startsWith("/session-ended")) return true;
      if (pathname.startsWith("/login")) {
        return isLoggedIn ? Response.redirect(new URL("/", request.nextUrl)) : true;
      }
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.username = user.username;
        token.sessionVersion = user.sessionVersion;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      session.user.username = token.username as string;
      session.user.sessionVersion = (token.sessionVersion as number | undefined) ?? 0;
      return session;
    },
  },
} satisfies NextAuthConfig;
