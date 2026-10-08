import type { Metadata } from "next";
import { Clock3, FileText, UserRoundCheck } from "lucide-react";
import { Brand, BrandMark } from "@/components/layout/brand";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const POINTS = [
  { icon: Clock3, text: "OUT / IN times with automatic duration" },
  { icon: UserRoundCheck, text: "Live view of who is outside right now" },
  { icon: FileText, text: "WhatsApp-ready daily and monthly reports" },
];

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { ended } = await searchParams;
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <section className="relative hidden flex-col justify-between bg-navy p-10 text-white lg:flex">
        <Brand />
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">Employee IN / OUT &amp; Movement Register</h2>
          <p className="mt-3 text-navy-foreground/80">
            Record who goes out, where and why. Durations and reports are calculated for you.
          </p>
          <ul className="mt-8 space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-navy-foreground">
                <span className="flex size-9 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="size-[18px]" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-navy-foreground/60">© {new Date().getFullYear()} DDSR GROUP · Internal use only</p>
      </section>

      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandMark />
            <div className="font-semibold tracking-wide">DDSR GROUP</div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mb-8 mt-1 text-sm text-muted-foreground">Use your office account to continue.</p>
          {ended && (
            <p role="status" className="-mt-4 mb-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Your session has ended (password or access changed). Please sign in again.
            </p>
          )}
          <LoginForm />
        </div>
      </section>
    </div>
  );
}
