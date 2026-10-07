# DDSR GROUP — Employee IN / OUT & Movement Register

Next.js 16 · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Prisma 7 + PostgreSQL · Auth.js v5

Records when staff go out and come back, calculates durations, and produces the
WhatsApp-ready daily report and the monthly statistics automatically.

---

## Local development

```bash
npm install
npm run db:start      # terminal 1 — local PostgreSQL on port 5433 (keep running)
npm run db:migrate    # apply migrations
npm run db:seed       # demo data: employees, locations, sample day 06/10/2026
npm run dev           # terminal 2 — http://localhost:3000
```

Demo logins (development only): `admin / admin@123`, `staff / staff@123`.

---

## Production deployment

### 1. Database
Create a PostgreSQL 15+ database (Neon, Supabase, AWS RDS, DigitalOcean, or your own
server). Use an SSL connection string, e.g.
`postgresql://USER:PASSWORD@HOST:5432/ddsr_movement?sslmode=require`.

### 2. Environment variables
Copy `.env.example` and fill in:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `AUTH_SECRET` | ✅ | 32+ random characters — `npx auth secret` |
| `NEXT_PUBLIC_APP_TIMEZONE` | ✅ | `Asia/Kolkata` |
| `AUTH_TRUST_HOST` | own server | `true` when running behind Nginx/Docker (not needed on Vercel) |
| `SEED_ADMIN_PASSWORD` | first setup | Initial password for user `admin` (8+ chars) |
| `SEED_DEMO` | — | `false` in production |
| `SMTP_HOST` | — | Enables email toggles in Settings |

The server refuses to start in production if `DATABASE_URL` or a strong `AUTH_SECRET` is missing.

### 3. Create tables and the first admin (once)
Run from any machine that can reach the database, with the production env vars set:

```bash
npm ci
npm run db:deploy     # prisma migrate deploy — creates/updates tables
npm run db:seed       # creates user "admin" with SEED_ADMIN_PASSWORD + default purposes
```

Sign in as `admin`, then **Settings → System & Security → Change Password**, add users in
**Settings → Users & Access**, and add employees/locations in **Master Data**.

### 4a. Deploy on Vercel
Import the repository, add the environment variables, deploy. The build command is
`npm run build`. Run step 3 against the production database before first use and after
every release that adds a migration.

### 4b. Deploy on your own server (Node)
```bash
npm ci
npm run build
npm run db:deploy
NODE_ENV=production PORT=3000 node .next/standalone/server.js
```
Copy `.next/static` → `.next/standalone/.next/static` and `public` → `.next/standalone/public`
before starting, and put Nginx/Caddy in front for HTTPS. Use a process manager (pm2/systemd).

### 4c. Docker
```bash
docker build -t ddsr-movement .
docker build --target migrate -t ddsr-movement-migrate .
docker run --rm --env-file .env.production ddsr-movement-migrate   # migrations
docker run -d -p 3000:3000 --env-file .env.production --restart unless-stopped ddsr-movement
```

### Health check & backups
- `GET /api/health` → `{"status":"ok"}` when the app and database respond (for uptime monitors).
- **Settings → Data & Backup → Download Backup** exports all records as JSON.
- Also enable automated backups / point-in-time recovery on the database provider.

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
