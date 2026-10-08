// One-time import of DDSR's starting master data into a live database:
// 8 employees (no mobile numbers), their departments, locations and Authorized By.
// Safe to re-run: existing records (matched by code / name) are left untouched
// and nothing is ever deleted. No movement entries are created.
//
// Run:  npx tsx prisma/import-masters.ts   (uses DATABASE_URL)
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../lib/generated/prisma/client";
import { mysqlPoolConfig } from "../lib/db-config";

const db = new PrismaClient({ adapter: new PrismaMariaDb(mysqlPoolConfig()) });

const EMPLOYEES: { name: string; code: string; department: string; designation: string }[] = [
  { name: "Rohan", code: "EMP001", department: "Sales", designation: "Sales Executive" },
  { name: "Shailesh", code: "EMP002", department: "Accounts", designation: "Accountant" },
  { name: "Ranjit", code: "EMP003", department: "Site", designation: "Site Supervisor" },
  { name: "Mahavir", code: "EMP004", department: "Operations", designation: "Operations Executive" },
  { name: "Sham", code: "EMP005", department: "Office", designation: "Office Assistant" },
  { name: "Sahil", code: "EMP006", department: "Field", designation: "Field Executive" },
  { name: "Vishal", code: "EMP007", department: "Office", designation: "Office Assistant" },
  { name: "Sujata", code: "EMP008", department: "HR", designation: "HR Executive" },
];

const LOCATIONS: { name: string; area: string; city: string; purpose?: string }[] = [
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

async function main() {
  const admin = await db.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });
  const created = { departments: 0, employees: 0, locations: 0, authorizers: 0 };
  const log = (entityType: string, entityId: string, summary: string) =>
    db.auditLog.create({ data: { entityType, entityId, action: "CREATE", userId: admin?.id, summary } });

  const deptIds = new Map<string, string>();
  for (const name of new Set(EMPLOYEES.map((e) => e.department))) {
    let d = await db.department.findUnique({ where: { name } });
    if (!d) {
      d = await db.department.create({ data: { name } });
      await log("Department", d.id, `Department ${name} imported`);
      created.departments++;
    }
    deptIds.set(name, d.id);
  }

  for (const e of EMPLOYEES) {
    if (await db.employee.findUnique({ where: { code: e.code } })) continue;
    const row = await db.employee.create({
      data: { name: e.name, code: e.code, designation: e.designation, departmentId: deptIds.get(e.department) },
    });
    await log("Employee", row.id, `Employee ${e.name} (${e.code}) imported`);
    created.employees++;
  }

  const purposes = new Map((await db.purpose.findMany({ select: { id: true, name: true } })).map((p) => [p.name, p.id]));
  for (const l of LOCATIONS) {
    if (await db.location.findUnique({ where: { name: l.name } })) continue;
    const row = await db.location.create({
      data: { name: l.name, area: l.area, city: l.city, defaultPurposeId: l.purpose ? (purposes.get(l.purpose) ?? null) : null },
    });
    await log("Location", row.id, `Location ${l.name} imported`);
    created.locations++;
  }

  for (const [i, [name, designation, department]] of AUTHORIZERS.entries()) {
    if (await db.authorizationPerson.findUnique({ where: { name } })) continue;
    const row = await db.authorizationPerson.create({ data: { name, designation, department, sortOrder: i } });
    await log("AuthorizationPerson", row.id, `Authorized person ${name} imported`);
    created.authorizers++;
  }

  const totals = {
    employees: await db.employee.count(),
    departments: await db.department.count(),
    locations: await db.location.count(),
    authorizers: await db.authorizationPerson.count(),
    purposes: await db.purpose.count(),
    movements: await db.movement.count(),
  };
  console.log("Created now:", created);
  console.log("Totals in database:", totals);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
