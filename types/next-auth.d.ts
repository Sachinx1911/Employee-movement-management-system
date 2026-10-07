import type { DefaultSession } from "next-auth";

type AppRole = "ADMIN" | "STAFF";

declare module "next-auth" {
  interface User {
    role: AppRole;
    username: string;
  }
  interface Session {
    user: { id: string; role: AppRole; username: string } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: AppRole;
    username: string;
  }
}
