import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { normalizeAppSettings, type AppSettings } from "@/lib/app-settings";
import { isSuperAdmin, type Role } from "@/lib/roles";

/** Per-request cached read of the "app" settings row. */
export const getAppSettings = cache(async (): Promise<AppSettings> => {
  const row = await db.setting.findUnique({ where: { key: "app" } });
  return normalizeAppSettings(row?.value);
});

export const getLogo = cache(async (): Promise<string | null> => {
  const row = await db.setting.findUnique({ where: { key: "logo" } });
  const v = row?.value as { dataUrl?: unknown } | null;
  return typeof v?.dataUrl === "string" ? v.dataUrl : null;
});

/** Users the viewer may see: an ADMIN never sees SUPER_ADMIN accounts. */
export async function listUsers(viewer: Role) {
  return db.user.findMany({
    where: isSuperAdmin(viewer) ? {} : { role: { not: "SUPER_ADMIN" } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, username: true, role: true, active: true, createdAt: true },
  });
}

export const AUDIT_PAGE = 25;

/** Hides everything done by or about a super admin (incl. failed logins) from non-super viewers. */
async function auditScope(viewer: Role): Promise<Prisma.AuditLogWhereInput> {
  if (isSuperAdmin(viewer)) return {};
  const supers = await db.user.findMany({ where: { role: "SUPER_ADMIN" }, select: { id: true, username: true } });
  const ids = supers.map((s) => s.id);
  return {
    AND: [
      { OR: [{ userId: null }, { userId: { notIn: ids } }] },
      { NOT: { entityType: "User", entityId: { in: ids } } },
      { NOT: { entityType: "Login", entityId: { in: supers.map((s) => s.username) } } },
    ],
  };
}

export async function listAudit(page: number, viewer: Role) {
  const where = await auditScope(viewer);
  const [total, rows] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * AUDIT_PAGE,
      take: AUDIT_PAGE,
      include: { user: { select: { name: true } } },
    }),
  ]);
  return {
    total,
    rows: rows.map((r) => ({
      id: r.id,
      at: r.createdAt.toISOString(),
      user: r.user?.name ?? "System",
      entityType: r.entityType,
      action: r.action,
      summary: r.summary,
      changes: r.changes,
    })),
  };
}
