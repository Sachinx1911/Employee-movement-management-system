import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { normalizeAppSettings, type AppSettings } from "@/lib/app-settings";

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

export async function listUsers() {
  return db.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, username: true, role: true, active: true, createdAt: true },
  });
}

export const AUDIT_PAGE = 25;

export async function listAudit(page: number) {
  const [total, rows] = await Promise.all([
    db.auditLog.count(),
    db.auditLog.findMany({
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
