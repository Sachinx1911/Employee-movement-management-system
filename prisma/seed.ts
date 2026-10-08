// Seed data for DDSR GROUP movement system.
// Run: npx prisma db seed — idempotent; never deletes data.
// Production: SEED_ADMIN_PASSWORD required on first run. Demo data only with SEED_DEMO=true (local script).
import "dotenv/config";
import bcrypt from "bcryptjs";
import { TZDate } from "@date-fns/tz";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../lib/generated/prisma/client";
import { mysqlPoolConfig } from "../lib/db-config";

const TZ = process.env.NEXT_PUBLIC_APP_TIMEZONE || "Asia/Kolkata";
const db = new PrismaClient({ adapter: new PrismaMariaDb(mysqlPoolConfig()) });

const DEPARTMENTS = ["Sales", "Accounts", "Site", "Operations", "Office", "HR", "Management", "Field"];

const EMPLOYEES: { name: string; code: string; department: string; designation: string; mobile: string; active?: boolean }[] = [
  { name: "Rohan", code: "EMP001", department: "Sales", designation: "Sales Executive", mobile: "9876543210" },
  { name: "Shailesh", code: "EMP002", department: "Accounts", designation: "Accountant", mobile: "9876543211" },
  { name: "Ranjit", code: "EMP003", department: "Site", designation: "Site Supervisor", mobile: "9876543212" },
  { name: "Mahavir", code: "EMP004", department: "Operations", designation: "Operations Executive", mobile: "9876543213" },
  { name: "Sham", code: "EMP005", department: "Office", designation: "Office Assistant", mobile: "9876543214" },
  { name: "Sahil", code: "EMP006", department: "Field", designation: "Field Executive", mobile: "9876543215" },
  { name: "Vishal", code: "EMP007", department: "Office", designation: "Office Assistant", mobile: "9876543216" },
  { name: "Sujata", code: "EMP008", department: "HR", designation: "HR Executive", mobile: "9876543217" },
  { name: "Datta", code: "EMP009", department: "Management", designation: "Partner", mobile: "9876543218", active: false },
  { name: "Satish", code: "EMP010", department: "Management", designation: "Director", mobile: "9876543219" },
  { name: "Prakash", code: "EMP011", department: "Sales", designation: "Sales Executive", mobile: "9876543220", active: false },
  { name: "Pravin", code: "EMP012", department: "Site", designation: "Site Engineer", mobile: "9876543221" },
];

const PURPOSES: [string, string][] = [
  ["Client Visit", "Client meeting or project discussion"],
  ["Bank Work", "Bank related work (Loan, Documentation, etc.)"],
  ["Office Work", "General office related work"],
  ["Society Work", "Society meeting or related work"],
  ["Document Submission", "Document submission at various offices"],
  ["Site Visit", "Visit to project or construction site"],
  ["Side Visit", "Short local visit"],
  ["Stamp Paper", "Purchase of stamp paper"],
  ["Government Office", "Work at a government / municipal office"],
  ["Advocate Office", "Visit to advocate / legal office"],
  ["Lunch", "Lunch break outside office"],
  ["Other", "Any other purpose"],
];

const LOCATIONS: { name: string; area?: string; city: string; purpose?: string }[] = [
  { name: "Kamothe", area: "Kamothe", city: "Navi Mumbai", purpose: "Office Work" },
  { name: "Kalamboli", area: "Kalamboli", city: "Navi Mumbai", purpose: "Office Work" },
  { name: "Kharghar", area: "Kharghar", city: "Navi Mumbai", purpose: "Client Visit" },
  { name: "Belapur", area: "Belapur", city: "Navi Mumbai", purpose: "Client Visit" },
  { name: "Vashi", area: "Vashi", city: "Navi Mumbai", purpose: "Bank Work" },
  { name: "Panvel", area: "Panvel", city: "Panvel", purpose: "Government Office" },
  { name: "New Panvel", area: "New Panvel", city: "Panvel" },
  { name: "Khanda Colony", area: "New Panvel", city: "Panvel", purpose: "Side Visit" },
  { name: "CIDCO - Belapur", area: "CBD Belapur", city: "Navi Mumbai", purpose: "Office Work" },
  { name: "BOB - Vashi", area: "Vashi", city: "Navi Mumbai", purpose: "Bank Work" },
  { name: "BOB Bank - Kalamboli", area: "Kalamboli", city: "Navi Mumbai", purpose: "Bank Work" },
  { name: "Sawli Society - Kharghar", area: "Kharghar", city: "Navi Mumbai", purpose: "Society Work" },
  { name: "Adv Office - Panvel", area: "Panvel", city: "Panvel", purpose: "Advocate Office" },
  { name: "G.T.B. Nagar - Mumbai", area: "G.T.B. Nagar", city: "Mumbai", purpose: "Office Work" },
  { name: "Stamp Paper - Kalamboli", area: "Kalamboli", city: "Navi Mumbai", purpose: "Stamp Paper" },
  { name: "Nerul", area: "Nerul", city: "Navi Mumbai" },
  { name: "Taloja", area: "Taloja", city: "Navi Mumbai" },
  { name: "Mumbai", area: "Fort", city: "Mumbai" },
];

// "NIL" in reports means no authorizer was selected (authorizedById = null).
const AUTHORIZERS: [string, string, string][] = [
  ["Satish Sir", "Director", "Management"],
  ["Manager", "Manager", "Operations"],
  ["Admin", "Administrator", "Admin"],
  ["Accounts Head", "Head - Accounts", "Accounts"],
  ["Site Incharge", "Site Incharge", "Site"],
  ["HR Manager", "HR Manager", "HR"],
  ["Sales Head", "Head - Sales", "Sales"],
  ["Office Incharge", "Office Incharge", "Office"],
];

// Sample day from the existing WhatsApp reports (06/10/2026).
// [employee, location, purpose | null, authorizedBy, out "HH:mm", in "HH:mm" | null]
const SAMPLE_DATE = "2026-10-06";
const SAMPLE_MOVEMENTS: [string, string, string | null, string, string, string | null][] = [
  ["Rohan", "Khanda Colony", "Side Visit", "NIL", "12:43", "13:35"],
  ["Rohan", "BOB - Vashi", "Bank Work", "NIL", "14:23", "17:41"],
  ["Shailesh", "BOB Bank - Kalamboli", "Bank Work", "NIL", "14:23", "17:41"],
  ["Ranjit", "Kamothe", "Office Work", "NIL", "12:53", "14:13"],
  ["Ranjit", "Kalamboli", "Bank Work", "Satish Sir", "15:30", "16:20"],
  ["Mahavir", "Panvel", "Government Office", "Manager", "10:45", "12:30"],
  ["Mahavir", "Kharghar", "Client Visit", "NIL", "13:40", "15:10"],
  ["Mahavir", "Vashi", "Document Submission", "NIL", "16:05", "17:20"],
  ["Sham", "Belapur", "Stamp Paper", "NIL", "15:04", "15:58"],
  ["Sham", "CIDCO - Belapur", "Office Work", "NIL", "16:31", "17:43"],
  ["Sahil", "Belapur", "Client Visit", "NIL", "15:07", "16:52"],
  ["Sahil", "Kamothe", "Society Work", "NIL", "17:30", null],
  ["Vishal", "Kharghar", "Site Visit", "Satish Sir", "11:15", "13:05"],
  ["Sujata", "Vashi", "Advocate Office", "Satish Sir", "14:00", "15:25"],
];

function at(dateKey: string, time: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(new TZDate(y, m - 1, d, hh, mm, 0, TZ).getTime());
}

async function main() {
  // Demo data and the default password are used ONLY when SEED_DEMO=true, which
  // is set by the local `npm run db:start` script. A hosted database (Hostinger
  // also uses host "localhost") therefore never receives them.
  const demo = process.env.SEED_DEMO === "true";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || (demo ? "admin@123" : "");
  // The admin is created once; later runs (e.g. every deploy) leave it untouched.
  let admin = await db.user.findUnique({ where: { username: "admin" } });
  if (!admin) {
    if (adminPassword.length < 8) throw new Error("Set SEED_ADMIN_PASSWORD (at least 8 characters) for the first deploy.");
    admin = await db.user.create({ data: { name: "Admin", username: "admin", role: "ADMIN", passwordHash: await bcrypt.hash(adminPassword, 10) } });
    console.log("Created user 'admin'.");
  }

  const purposeIds = new Map<string, string>();
  for (const [i, [name, description]] of PURPOSES.entries()) {
    const p = await db.purpose.upsert({ where: { name }, update: {}, create: { name, description, sortOrder: i } });
    purposeIds.set(name, p.id);
  }

  await db.setting.upsert({
    where: { key: "whatsappReport" },
    update: {},
    create: {
      key: "whatsappReport",
      value: { showPurpose: true, showAuthorizedBy: true, showEmployeeTotal: true, title: "DAILY IN - OUT REPORT" },
    },
  });

  if (!demo) {
    console.log("Seed complete (production): admin user and default purposes.");
    console.log("Sign in as 'admin' with SEED_ADMIN_PASSWORD, then add employees, locations and users from the app.");
    return;
  }

  const staffPassword = process.env.SEED_STAFF_PASSWORD || "staff@123";
  await db.user.upsert({
    where: { username: "staff" },
    update: {},
    create: { name: "Office Staff", username: "staff", role: "STAFF", passwordHash: await bcrypt.hash(staffPassword, 10) },
  });

  const deptIds = new Map<string, string>();
  for (const name of DEPARTMENTS) {
    const d = await db.department.upsert({ where: { name }, update: {}, create: { name } });
    deptIds.set(name, d.id);
  }

  const empIds = new Map<string, string>();
  for (const e of EMPLOYEES) {
    const row = await db.employee.upsert({
      where: { code: e.code },
      update: {},
      create: {
        name: e.name,
        code: e.code,
        designation: e.designation,
        mobile: e.mobile,
        active: e.active ?? true,
        departmentId: deptIds.get(e.department),
      },
    });
    empIds.set(e.name, row.id);
  }

  const locIds = new Map<string, string>();
  for (const l of LOCATIONS) {
    const row = await db.location.upsert({
      where: { name: l.name },
      update: {},
      create: { name: l.name, area: l.area, city: l.city, defaultPurposeId: l.purpose ? purposeIds.get(l.purpose) : undefined },
    });
    locIds.set(l.name, row.id);
  }

  const authIds = new Map<string, string>();
  for (const [i, [name, designation, department]] of AUTHORIZERS.entries()) {
    const a = await db.authorizationPerson.upsert({ where: { name }, update: {}, create: { name, designation, department, sortOrder: i } });
    authIds.set(name, a.id);
  }

  // Sample day — created once; never overwrites entries already on that date.
  const sampleDate = new Date(`${SAMPLE_DATE}T00:00:00.000Z`);
  if ((await db.movement.count({ where: { date: sampleDate } })) === 0) {
    for (const [emp, loc, purpose, authBy, out, back] of SAMPLE_MOVEMENTS) {
      const employeeId = empIds.get(emp)!;
      const outTime = at(SAMPLE_DATE, out);
      const inTime = back ? at(SAMPLE_DATE, back) : null;
      if (!inTime && (await db.movement.findUnique({ where: { activeEmployeeId: employeeId } }))) continue;
      await db.movement.create({
        data: {
          employeeId,
          date: sampleDate,
          locationId: locIds.get(loc)!,
          purposeId: purpose ? purposeIds.get(purpose) : null,
          authorizedById: authBy === "NIL" ? null : authIds.get(authBy),
          outTime,
          inTime,
          durationMinutes: inTime ? Math.floor((inTime.getTime() - outTime.getTime()) / 60_000) : null,
          status: inTime ? "COMPLETED" : "OUTSIDE",
          activeEmployeeId: inTime ? null : employeeId,
          createdById: admin.id,
        },
      });
    }
  }

  const count = await db.movement.count();
  console.log(`Seed complete (demo): ${EMPLOYEES.length} employees, ${count} movements.`);
  console.log(`Demo logins → admin / ${adminPassword}   staff / ${staffPassword}  (change these after first login)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
