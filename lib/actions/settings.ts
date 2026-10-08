"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { ActionResult } from "@/lib/action-result";
import { DEFAULT_APP_SETTINGS, normalizeAppSettings } from "@/lib/app-settings";
import { audit } from "@/lib/audit";
import { AuthError, getActionUser } from "@/lib/auth-guard";
import { normalizeReportOptions } from "@/lib/report-generator";

function fail(error: unknown, fallback = "Something went wrong. Please try again."): { ok: false; error: string } {
  if (error instanceof AuthError) return { ok: false, error: error.message };
  console.error(error);
  return { ok: false, error: fallback };
}

// ───────────────────────── WhatsApp report options ─────────────────────────

/** Persist WhatsApp report preferences (admin only). */
export async function saveReportOptions(input: unknown): Promise<ActionResult> {
  try {
    const user = await getActionUser({ admin: true });
    const value = normalizeReportOptions(input);
    const before = await db.setting.findUnique({ where: { key: "whatsappReport" } });
    await db.$transaction(async (tx) => {
      await tx.setting.upsert({
        where: { key: "whatsappReport" },
        update: { value: value as Prisma.InputJsonValue },
        create: { key: "whatsappReport", value: value as Prisma.InputJsonValue },
      });
      await audit(tx, {
        entityType: "Setting",
        entityId: "whatsappReport",
        action: "UPDATE",
        userId: user.id,
        summary: "WhatsApp report options changed",
        changes: { from: before?.value ?? null, to: value },
      });
    });
    revalidatePath("/daily-report");
    revalidatePath("/settings");
    return { ok: true, message: "Report options saved." };
  } catch (error) {
    return fail(error, "Could not save report options.");
  }
}

// ───────────────────────── App settings ─────────────────────────

export async function saveAppSettings(input: unknown): Promise<ActionResult> {
  try {
    const user = await getActionUser({ admin: true });
    const value = normalizeAppSettings(input);
    if (value.workingHours.end <= value.workingHours.start) return { ok: false, error: "Office end time must be after start time." };
    if (value.workingHours.lunchEnd <= value.workingHours.lunchStart) return { ok: false, error: "Lunch end must be after lunch start." };
    if (value.company.email && !z.email().safeParse(value.company.email).success) return { ok: false, error: "Enter a valid company email." };
    const before = await db.setting.findUnique({ where: { key: "app" } });
    await db.$transaction(async (tx) => {
      await tx.setting.upsert({
        where: { key: "app" },
        update: { value: value as Prisma.InputJsonValue },
        create: { key: "app", value: value as Prisma.InputJsonValue },
      });
      await audit(tx, {
        entityType: "Setting",
        entityId: "app",
        action: "UPDATE",
        userId: user.id,
        summary: "Application settings saved",
        changes: { from: before?.value ?? DEFAULT_APP_SETTINGS, to: value },
      });
    });
    revalidatePath("/", "layout");
    return { ok: true, message: "Settings saved successfully." };
  } catch (error) {
    return fail(error, "Could not save settings.");
  }
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export async function saveLogo(dataUrl: string): Promise<ActionResult> {
  try {
    const user = await getActionUser({ admin: true });
    const m = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
    if (!m) return { ok: false, error: "Logo must be a PNG or JPG image." };
    if ((m[2]!.length * 3) / 4 > MAX_LOGO_BYTES) return { ok: false, error: "Logo must be 2 MB or smaller." };
    await db.$transaction(async (tx) => {
      await tx.setting.upsert({ where: { key: "logo" }, update: { value: { dataUrl } }, create: { key: "logo", value: { dataUrl } } });
      await audit(tx, { entityType: "Setting", entityId: "logo", action: "UPDATE", userId: user.id, summary: "Company logo changed" });
    });
    revalidatePath("/", "layout");
    return { ok: true, message: "Logo updated." };
  } catch (error) {
    return fail(error, "Could not save logo.");
  }
}

export async function removeLogo(): Promise<ActionResult> {
  try {
    const user = await getActionUser({ admin: true });
    await db.setting.deleteMany({ where: { key: "logo" } });
    await audit(db, { entityType: "Setting", entityId: "logo", action: "DELETE", userId: user.id, summary: "Company logo removed" });
    revalidatePath("/", "layout");
    return { ok: true, message: "Logo removed." };
  } catch (error) {
    return fail(error);
  }
}

// ───────────────────────── Users & access ─────────────────────────

const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(100, "Password is too long")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/\d/, "Password must contain a number");
const userSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,30}$/, "Username: 3-30 letters, numbers, . _ -"),
  role: z.enum(["ADMIN", "STAFF"]),
  password: passwordSchema,
});

async function hasAnotherAdmin(excludingId: string) {
  return (await db.user.count({ where: { role: "ADMIN", active: true, id: { not: excludingId } } })) > 0;
}

export async function createUser(input: unknown): Promise<ActionResult> {
  try {
    const me = await getActionUser({ admin: true });
    const parsed = userSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };
    const v = parsed.data;
    if (await db.user.findUnique({ where: { username: v.username } })) return { ok: false, error: "This username is already taken." };
    const u = await db.user.create({ data: { name: v.name, username: v.username, role: v.role, passwordHash: await bcrypt.hash(v.password, 12) } });
    await audit(db, { entityType: "User", entityId: u.id, action: "CREATE", userId: me.id, summary: `User ${u.username} (${u.role}) created` });
    revalidatePath("/settings");
    return { ok: true, message: `User ${u.username} created.` };
  } catch (error) {
    return fail(error);
  }
}

export async function updateUser(id: string, patch: { role?: "ADMIN" | "STAFF"; active?: boolean }): Promise<ActionResult> {
  try {
    const me = await getActionUser({ admin: true });
    const u = await db.user.findUnique({ where: { id } });
    if (!u) return { ok: false, error: "User not found." };
    const demoting = patch.role === "STAFF" && u.role === "ADMIN";
    const deactivating = patch.active === false && u.active;
    if (id === me.id && (demoting || deactivating)) return { ok: false, error: "You cannot remove your own admin access." };
    if ((demoting || (deactivating && u.role === "ADMIN")) && !(await hasAnotherAdmin(id))) {
      return { ok: false, error: "At least one active admin is required." };
    }
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    if (patch.role && patch.role !== u.role) changes.role = { from: u.role, to: patch.role };
    if (patch.active !== undefined && patch.active !== u.active) changes.active = { from: u.active, to: patch.active };
    const accessChanged = Object.keys(changes).length > 0;
    await db.user.update({
      where: { id },
      data: { role: patch.role ?? u.role, active: patch.active ?? u.active, ...(accessChanged ? { sessionVersion: { increment: 1 } } : {}) },
    });
    await audit(db, { entityType: "User", entityId: id, action: "UPDATE", userId: me.id, summary: `User ${u.username} updated`, changes });
    revalidatePath("/settings");
    return { ok: true, message: `${u.name} updated.` };
  } catch (error) {
    return fail(error);
  }
}

export async function resetUserPassword(id: string, password: string): Promise<ActionResult> {
  try {
    const me = await getActionUser({ admin: true });
    const p = passwordSchema.safeParse(password);
    if (!p.success) return { ok: false, error: p.error.issues[0]!.message };
    const u = await db.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(p.data, 12), sessionVersion: { increment: 1 } } });
    await audit(db, { entityType: "User", entityId: id, action: "PASSWORD_RESET", userId: me.id, summary: `Password reset for ${u.username}` });
    return { ok: true, message: `Password reset for ${u.name}.` };
  } catch (error) {
    return fail(error);
  }
}

export async function changeMyPassword(current: string, next: string): Promise<ActionResult> {
  try {
    const me = await getActionUser();
    const p = passwordSchema.safeParse(next);
    if (!p.success) return { ok: false, error: p.error.issues[0]!.message };
    const u = await db.user.findUnique({ where: { id: me.id } });
    if (!u || !(await bcrypt.compare(current, u.passwordHash))) return { ok: false, error: "Current password is incorrect." };
    if (current === p.data) return { ok: false, error: "New password must be different from the current one." };
    await db.user.update({ where: { id: me.id }, data: { passwordHash: await bcrypt.hash(p.data, 12), sessionVersion: { increment: 1 } } });
    await audit(db, { entityType: "User", entityId: me.id, action: "PASSWORD_CHANGE", userId: me.id, summary: `${u.username} changed password` });
    return { ok: true, message: "Password changed. Please sign in again with the new password." };
  } catch (error) {
    return fail(error);
  }
}
