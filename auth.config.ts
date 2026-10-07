import type { NextAuthConfig } from "next-auth";

// Edge-safe part of the Auth.js config (no database access). Used by proxy.ts
// for the optimistic redirect; real authorization happens on the server in
// lib/auth-guard.ts for every page and server action.
const ADMIN_ONLY_PREFIXES = ["/monthly-report", "/master-data", "/settings", "/audit-log"];

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      if (pathname.startsWith("/login")) {
        return isLoggedIn ? Response.redirect(new URL("/", request.nextUrl)) : true;
      }
      if (!isLoggedIn) return false;
      if (auth.user.role !== "ADMIN" && ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p))) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.username = user.username;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as "ADMIN" | "STAFF";
      session.user.username = token.username as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
