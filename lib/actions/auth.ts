"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

export type LoginState = { error?: string; lockedUntil?: number; attemptsLeft?: number } | undefined;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", {
      username: String(formData.get("username") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const code = String((error as AuthError & { code?: string }).code ?? "");
      const locked = /^locked_(\d+)$/.exec(code);
      if (locked) {
        return { error: "Too many failed attempts. This account is locked for a short time.", lockedUntil: Number(locked[1]) };
      }
      const invalid = /^invalid_(\d+)$/.exec(code);
      const attemptsLeft = invalid ? Number(invalid[1]) : undefined;
      return { error: "Invalid username or password.", attemptsLeft };
    }
    throw error; // let Next.js handle the redirect
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
