"use server";

import { db } from "@/lib/db";
import { getActionUser } from "@/lib/auth-guard";

export type SearchHit = { type: "employees" | "locations" | "purposes" | "authorizers"; id: string; title: string; subtitle: string };

/** Quick search across master data for the top bar. */
export async function searchAll(raw: string): Promise<SearchHit[]> {
  const user = await getActionUser().catch(() => null);
  if (!user || user.role !== "ADMIN") return [];
  const q = raw.trim().slice(0, 60);
  if (q.length < 2) return [];
  // MySQL utf8mb4 collation compares case-insensitively.
  const contains = { contains: q };

  const [employees, locations, purposes, authorizers] = await Promise.all([
    db.employee.findMany({
      where: { OR: [{ name: contains }, { code: contains }, { mobile: contains }, { designation: contains }] },
      select: { id: true, name: true, code: true, designation: true },
      take: 5,
    }),
    db.location.findMany({ where: { OR: [{ name: contains }, { area: contains }, { city: contains }] }, select: { id: true, name: true, city: true }, take: 5 }),
    db.purpose.findMany({ where: { name: contains }, select: { id: true, name: true, description: true }, take: 4 }),
    db.authorizationPerson.findMany({ where: { name: contains }, select: { id: true, name: true, designation: true }, take: 4 }),
  ]);

  return [
    ...employees.map((e) => ({ type: "employees" as const, id: e.id, title: e.name, subtitle: [e.code, e.designation].filter(Boolean).join(" · ") })),
    ...locations.map((l) => ({ type: "locations" as const, id: l.id, title: l.name, subtitle: l.city ?? "Location" })),
    ...purposes.map((p) => ({ type: "purposes" as const, id: p.id, title: p.name, subtitle: p.description ?? "Purpose" })),
    ...authorizers.map((a) => ({ type: "authorizers" as const, id: a.id, title: a.name, subtitle: a.designation ?? "Authorized person" })),
  ];
}
