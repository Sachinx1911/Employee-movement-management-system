# DDSR GROUP — Employee IN / OUT & Movement Register

Next.js 16 · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Prisma 7 + MySQL/MariaDB · Auth.js v5

Records when staff go out and come back, calculates durations, and produces the
WhatsApp-ready daily report and the monthly statistics automatically.

---

## Local development

```bash
npm install
npm run db:start      # terminal 1 — local MySQL on port 3307; applies migrations + demo data (keep running)
npm run dev           # terminal 2 — http://localhost:3000
```

`.env` for local: `DATABASE_URL="mysql://root@127.0.0.1:3307/ddsr_movement"`. The local database is
temporary — it is recreated with demo data each time `db:start` runs.
Demo logins (local only): `admin / admin@123`, `staff / staff@123`.

---

## Production deployment — Hostinger Business Web Hosting

Step-by-step guide (Marathi + English): **[HOSTINGER-DEPLOY.md](HOSTINGER-DEPLOY.md)**

Summary:
1. hPanel → **Databases → MySQL Databases**: create a database + user.
2. hPanel → **Websites → Add website → Node.js Apps** → import this GitHub repository.
3. Build settings: Node **22.x**, build command `npm run build:prod`, start command `npm start`.
4. Environment variables: `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_TIMEZONE`, `AUTH_TRUST_HOST=true`,
   `SEED_ADMIN_PASSWORD` (first deploy).
5. Deploy. `build:prod` applies migrations (`prisma migrate deploy`), creates the first admin, then builds.

### Other hosts
- Any Node 20.19+ server: `npm ci && npm run build:prod && npm start` with the same env vars.
- Docker: `docker build -t ddsr-movement .` (standalone image; run migrations with
  `docker build --target migrate -t ddsr-movement-migrate .`).

### Health check & backups
- `GET /api/health` → `{"status":"ok"}` when the app and database respond.
- **Settings → Data & Backup → Download Backup** exports all records as JSON.
- Also enable Hostinger's daily backups for the database.

---

## Security
- Passwords hashed with bcrypt; sessions are signed JWT cookies (12 h), secure on HTTPS.
- Login locks a username for 15 minutes after 5 failed attempts.
- Roles: **ADMIN** (everything) and **STAFF** (OUT entry, Mark IN, today's pending entries, daily report).
  Every page and server action checks the role on the server.
- All input is validated on the server with Zod; Prisma parameterises every query.
- Security headers: CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy.
- Every create / edit / Mark IN / delete / login is written to the Audit Log (Settings → System & Security).
- Movements are never hard-deleted (voided); employees/locations with history can only be deactivated.

## Key business rules
- Duration is never typed in; it is `IN − OUT`, stored as whole minutes.
- One active OUT per employee is enforced by a unique column (`Movement.activeEmployeeId`).
- IN cannot be before OUT; future times are rejected; overlapping entries for one employee are rejected.
- Business dates use `NEXT_PUBLIC_APP_TIMEZONE` regardless of the server's timezone.
