import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { db } from "@/lib/db";

const credentialsSchema = z.object({
  username: z.string().trim().toLowerCase().min(1).max(50),
  password: z.string().min(1).max(200),
});

// Brute-force protection, stored in the audit log so it works across server
// instances: 5 failures lock a username, 20 failures lock an IP address, for 15 min.
const MAX_FAILURES = 5;
const MAX_IP_FAILURES = 20;
const LOCK_WINDOW_MS = 15 * 60 * 1000;

function clientIp(request: Request | undefined): string {
  const fwd = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (fwd || request?.headers.get("x-real-ip") || "unknown").slice(0, 64);
}

// Constant-time-ish path for unknown users so response time doesn't reveal them.
const DUMMY_HASH = "$2b$10$ys84s5FNJOqTGlGV34wGpeml2joEfv7YcSRfRftmrNmwldmr5ZVi6";

// The error `code` reaches the login form: "locked_<unlockEpochMs>" or
// "invalid_<attemptsLeft>", so it can show a countdown / attempts left.
class LockedError extends CredentialsSignin {
  constructor(unlockAt: number) {
    super();
    this.code = `locked_${unlockAt}`;
  }
}
class InvalidLogin extends CredentialsSignin {
  constructor(attemptsLeft: number) {
    super();
    this.code = `invalid_${attemptsLeft}`;
  }
}

/** When the count of failures in the window drops below `max` again. */
async function unlockTime(entityType: string, entityId: string, max: number, since: Date) {
  const rows = await db.auditLog.findMany({
    where: { entityType, entityId, action: "LOGIN_FAILED", createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: max,
    select: { createdAt: true },
  });
  const oldestThatCounts = rows[max - 1];
  return oldestThatCounts ? oldestThatCounts.createdAt.getTime() + LOCK_WINDOW_MS : Date.now();
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { username: {}, password: {} },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { username, password } = parsed.data;
        const ip = clientIp(request);

        const since = new Date(Date.now() - LOCK_WINDOW_MS);
        const [userFailures, ipFailures] = await Promise.all([
          db.auditLog.count({ where: { entityType: "Login", entityId: username, action: "LOGIN_FAILED", createdAt: { gte: since } } }),
          db.auditLog.count({ where: { entityType: "LoginIP", entityId: ip, action: "LOGIN_FAILED", createdAt: { gte: since } } }),
        ]);
        if (userFailures >= MAX_FAILURES || ipFailures >= MAX_IP_FAILURES) {
          const [byUser, byIp] = await Promise.all([
            userFailures >= MAX_FAILURES ? unlockTime("Login", username, MAX_FAILURES, since) : 0,
            ipFailures >= MAX_IP_FAILURES ? unlockTime("LoginIP", ip, MAX_IP_FAILURES, since) : 0,
          ]);
          throw new LockedError(Math.max(byUser, byIp));
        }

        const user = await db.user.findUnique({ where: { username } });
        const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !user.active || !ok) {
          await db.auditLog.createMany({
            data: [
              { entityType: "Login", entityId: username, action: "LOGIN_FAILED", summary: `Failed login for "${username}" from ${ip}` },
              { entityType: "LoginIP", entityId: ip, action: "LOGIN_FAILED" },
            ],
          });
          const left = MAX_FAILURES - (userFailures + 1);
          if (left <= 0) throw new LockedError(await unlockTime("Login", username, MAX_FAILURES, since));
          throw new InvalidLogin(left);
        }

        await db.auditLog.create({
          data: { entityType: "User", entityId: user.id, action: "LOGIN", userId: user.id, summary: `${user.name} logged in from ${ip}` },
        });
        return { id: user.id, name: user.name, role: user.role, username: user.username, sessionVersion: user.sessionVersion };
      },
    }),
  ],
});
