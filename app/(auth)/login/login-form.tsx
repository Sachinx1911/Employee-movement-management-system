"use client";

import { useActionState, useEffect, useState } from "react";
import { Clock, Loader2, LockKeyhole, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/lib/actions/auth";

/** Seconds until `until` (epoch ms), ticking every second; 0 when passed. */
function useSecondsLeft(until: number | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [until]);
  return until ? Math.max(0, Math.ceil((until - now) / 1000)) : 0;
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);
  const secondsLeft = useSecondsLeft(state?.lockedUntil);
  const locked = secondsLeft > 0;

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="username"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            required
            autoFocus
            className="h-11 pl-9"
            placeholder="Enter username"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="h-11 pl-9"
            placeholder="Enter password"
          />
        </div>
      </div>

      {locked ? (
        <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900">
          <div className="flex items-center gap-2 font-semibold">
            <Clock className="size-4" /> Account locked — try again in <span className="tabular text-base">{mmss(secondsLeft)}</span>
          </div>
          <p className="mt-1 text-amber-800">Too many wrong passwords. Wait for the timer, then sign in with the correct password.</p>
        </div>
      ) : state?.lockedUntil ? (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          You can sign in again now.
        </p>
      ) : (
        state?.error && (
          <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {state.error}
            {state.attemptsLeft !== undefined && (
              <span className="mt-0.5 block font-medium">
                {state.attemptsLeft} {state.attemptsLeft === 1 ? "attempt" : "attempts"} left before the account is locked for 15 minutes.
              </span>
            )}
          </p>
        )
      )}

      <Button type="submit" disabled={pending || locked} className="h-11 w-full text-[15px]">
        {pending && <Loader2 className="animate-spin" />}
        {pending ? "Signing in…" : locked ? `Locked · ${mmss(secondsLeft)}` : "Sign in"}
      </Button>
    </form>
  );
}
