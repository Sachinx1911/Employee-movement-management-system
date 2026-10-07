import { auth } from "@/auth";
import { db } from "@/lib/db";
import { todayKey } from "@/lib/date-utils";

/** Full JSON backup of business data (password hashes excluded). Admin only. */
export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return new Response("Forbidden", { status: 403 });

  const [users, departments, employees, locations, purposes, authorizationPersons, movements, auditLogs, settings] = await Promise.all([
    db.user.findMany({ select: { id: true, name: true, username: true, role: true, active: true, createdAt: true, updatedAt: true } }),
    db.department.findMany(),
    db.employee.findMany(),
    db.location.findMany(),
    db.purpose.findMany(),
    db.authorizationPerson.findMany(),
    db.movement.findMany(),
    db.auditLog.findMany(),
    db.setting.findMany({ where: { key: { not: "logo" } } }),
  ]);
  const body = JSON.stringify(
    {
      app: "ddsr-movement",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: { users, departments, employees, locations, purposes, authorizationPersons, movements, auditLogs, settings },
    },
    null,
    2,
  );
  await db.auditLog.create({ data: { entityType: "System", entityId: "backup", action: "BACKUP", userId: session.user.id, summary: "Backup downloaded" } });
  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="ddsr-backup-${todayKey()}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
