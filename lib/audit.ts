import "server-only";
import type { Prisma } from "@/lib/generated/prisma/client";

type AuditClient = Pick<Prisma.TransactionClient, "auditLog">;

export type Changes = Record<string, { from: unknown; to: unknown }>;

/** Field-by-field diff of two plain records (Dates compared by value). */
export function diff<T extends Record<string, unknown>>(before: T, after: Partial<T>, fields: (keyof T)[]): Changes {
  const changes: Changes = {};
  for (const field of fields) {
    if (!(field in after)) continue;
    const a = normalize(before[field]);
    const b = normalize(after[field]);
    if (a !== b) changes[String(field)] = { from: a, to: b };
  }
  return changes;
}

function normalize(v: unknown) {
  if (v instanceof Date) return v.toISOString();
  if (v === undefined || v === "") return null;
  return v;
}

export async function audit(
  client: AuditClient,
  entry: { entityType: string; entityId: string; action: string; userId: string; summary?: string; changes?: unknown },
) {
  await client.auditLog.create({
    data: {
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      userId: entry.userId,
      summary: entry.summary,
      changes: (entry.changes ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}
