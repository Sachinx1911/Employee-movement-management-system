"use server";

import { db } from "@/lib/db";
import { getActionUser } from "@/lib/auth-guard";

export type SearchHit = { type: "employees" | "locations" | "purposes" | "authorizers"; id: string; title: string; subtitle: string };

/**
 * Quick search across master data for the top bar.
 * Matching is done in JS rather than SQL LIKE: MariaDB 11 rejects the
 * `LIKE CONCAT(?, '%')` Prisma generates (collation mix), and master lists
 * are small (hundreds of rows at most).
 */
export async function searchAll(raw: string): Promise<SearchHit[]> {
  const user = await getActionUser().catch(() => null);
  if (!user || user.role !== "ADMIN") return [];
  const q = raw.trim().slice(0, 60).toLowerCase();
  if (q.length < 2) return [];
  const hit = (...fields: (string | null)[]) => fields.some((f) => f?.toLowerCase().includes(q));

  const [employees, locations, purposes, authorizers] = await Promise.all([
    db.employee.findMany({ select: { id: true, name: true, code: true, mobile: true, designation: true }, orderBy: { name: "asc" } }),
    db.location.findMany({ select: { id: true, name: true, area: true, city: true }, orderBy: { name: "asc" } }),
    db.purpose.findMany({ select: { id: true, name: true, description: true }, orderBy: { name: "asc" } }),
    db.authorizationPerson.findMany({ select: { id: true, name: true, designation: true }, orderBy: { name: "asc" } }),
  ]);

  return [
    ...employees
      .filter((e) => hit(e.name, e.code, e.mobile, e.designation))
      .slice(0, 5)
      .map((e) => ({ type: "employees" as const, id: e.id, title: e.name, subtitle: [e.code, e.designation].filter(Boolean).join(" · ") })),
    ...locations
      .filter((l) => hit(l.name, l.area, l.city))
      .slice(0, 5)
      .map((l) => ({ type: "locations" as const, id: l.id, title: l.name, subtitle: l.city ?? "Location" })),
    ...purposes
      .filter((p) => hit(p.name))
      .slice(0, 4)
      .map((p) => ({ type: "purposes" as const, id: p.id, title: p.name, subtitle: p.description ?? "Purpose" })),
    ...authorizers
      .filter((a) => hit(a.name))
      .slice(0, 4)
      .map((a) => ({ type: "authorizers" as const, id: a.id, title: a.name, subtitle: a.designation ?? "Authorized person" })),
  ];
}
