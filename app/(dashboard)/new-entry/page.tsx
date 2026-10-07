import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EntryGrid } from "@/components/new-entry/entry-grid";
import { requireUser } from "@/lib/auth-guard";
import { isDateKey, todayKey } from "@/lib/date-utils";
import { getDayEntries, getEntryOptions, getPendingIn } from "@/lib/queries/movements";

export const metadata: Metadata = { title: "New Entry" };

export default async function NewEntryPage({ searchParams }: PageProps<"/new-entry">) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = todayKey();
  const raw = typeof sp.date === "string" ? sp.date : today;
  if (!isDateKey(raw) || raw > today) redirect("/new-entry");
  const date = raw;

  const entries = await getDayEntries(date);
  const [options, pending] = await Promise.all([getEntryOptions(entries), getPendingIn()]);

  return (
    <EntryGrid
      key={date}
      date={date}
      entries={entries}
      options={options}
      pending={pending}
      isAdmin={user.role === "ADMIN"}
      showPending={sp.mode === "in"}
    />
  );
}
