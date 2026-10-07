import "server-only";
import { db } from "@/lib/db";
import { addDaysToKey, dateKeyToDb, dbDateToKey, formatDateKey, formatTime, todayKey, zonedDateTime } from "@/lib/date-utils";
import { formatDurationBadge } from "@/lib/duration-utils";
import { getAppSettings } from "@/lib/queries/settings";

export type AttentionItem = {
  id: string;
  level: "critical" | "warning";
  title: string;
  detail: string;
  href: string;
};

/**
 * Entries that need a human look:
 *  critical — IN time missing from a previous day
 *  warning  — outside longer than the "long outing" limit right now,
 *             a completed outing longer than that limit (last 7 days),
 *             an OUT time before office start today
 */
export async function getAttention(limit = 20): Promise<AttentionItem[]> {
  const { app, workingHours } = await getAppSettings();
  const today = todayKey();
  const longMinutes = app.longOutingHours * 60;
  const now = Date.now();
  const officeStart = zonedDateTime(today, workingHours.start);

  const [open, long, early] = await Promise.all([
    db.movement.findMany({
      where: { status: "OUTSIDE" },
      orderBy: { outTime: "asc" },
      include: { employee: { select: { name: true } }, location: { select: { name: true } } },
    }),
    db.movement.findMany({
      where: { status: "COMPLETED", durationMinutes: { gt: longMinutes }, date: { gte: dateKeyToDb(addDaysToKey(today, -7)) } },
      orderBy: { outTime: "desc" },
      take: 10,
      include: { employee: { select: { name: true } }, location: { select: { name: true } } },
    }),
    db.movement.findMany({
      where: { status: { not: "VOID" }, date: dateKeyToDb(today), outTime: { lt: officeStart } },
      include: { employee: { select: { name: true } } },
    }),
  ]);

  const items: AttentionItem[] = [];
  for (const m of open) {
    const day = dbDateToKey(m.date);
    const mins = Math.floor((now - m.outTime.getTime()) / 60_000);
    if (day < today) {
      items.push({
        id: `missing-${m.id}`,
        level: "critical",
        title: `${m.employee.name} — IN time missing`,
        detail: `${m.location.name} · OUT ${formatTime(m.outTime)} on ${formatDateKey(day)}`,
        href: `/new-entry?date=${day}`,
      });
    } else if (mins > longMinutes) {
      items.push({
        id: `long-open-${m.id}`,
        level: "warning",
        title: `${m.employee.name} outside for ${formatDurationBadge(mins)}`,
        detail: `${m.location.name} · OUT ${formatTime(m.outTime)}`,
        href: `/new-entry`,
      });
    }
  }
  for (const m of long) {
    const day = dbDateToKey(m.date);
    items.push({
      id: `long-${m.id}`,
      level: "warning",
      title: `${m.employee.name} — long outing (${formatDurationBadge(m.durationMinutes)})`,
      detail: `${m.location.name} · ${formatDateKey(day)} · check OUT/IN times`,
      href: `/new-entry?date=${day}`,
    });
  }
  for (const m of early) {
    items.push({
      id: `early-${m.id}`,
      level: "warning",
      title: `${m.employee.name} — OUT before office hours`,
      detail: `OUT ${formatTime(m.outTime)} (office starts ${workingHours.start})`,
      href: `/new-entry`,
    });
  }
  return items.slice(0, limit);
}
