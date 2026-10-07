import "server-only";
import { db } from "@/lib/db";
import { dbDateToKey } from "@/lib/date-utils";

// Master lists are small (hundreds of rows at most), so the Master Data page
// loads them whole and filters/paginates on the client.

export type EmployeeRow = {
  id: string;
  name: string;
  code: string | null;
  departmentId: string | null;
  departmentName: string | null;
  designation: string | null;
  mobile: string | null;
  email: string | null;
  joiningDate: string | null;
  address: string | null;
  notes: string | null;
  active: boolean;
  movementCount: number;
};

export type LocationRow = {
  id: string;
  name: string;
  area: string | null;
  city: string | null;
  defaultPurposeId: string | null;
  defaultPurposeName: string | null;
  active: boolean;
  movementCount: number;
};

export type PurposeRow = { id: string; name: string; description: string | null; active: boolean; movementCount: number };

export type AuthorizerRow = {
  id: string;
  name: string;
  designation: string | null;
  department: string | null;
  active: boolean;
  movementCount: number;
};

export type Option = { id: string; name: string };

export async function listEmployees(): Promise<EmployeeRow[]> {
  const rows = await db.employee.findMany({
    include: { department: { select: { name: true } }, _count: { select: { movements: true } } },
    orderBy: [{ code: { sort: "asc", nulls: "last" } }, { name: "asc" }],
  });
  return rows.map((e) => ({
    id: e.id,
    name: e.name,
    code: e.code,
    departmentId: e.departmentId,
    departmentName: e.department?.name ?? null,
    designation: e.designation,
    mobile: e.mobile,
    email: e.email,
    joiningDate: e.joiningDate ? dbDateToKey(e.joiningDate) : null,
    address: e.address,
    notes: e.notes,
    active: e.active,
    movementCount: e._count.movements,
  }));
}

export async function listLocations(): Promise<LocationRow[]> {
  const rows = await db.location.findMany({
    include: { defaultPurpose: { select: { name: true } }, _count: { select: { movements: true } } },
    orderBy: { name: "asc" },
  });
  return rows.map((l) => ({
    id: l.id,
    name: l.name,
    area: l.area,
    city: l.city,
    defaultPurposeId: l.defaultPurposeId,
    defaultPurposeName: l.defaultPurpose?.name ?? null,
    active: l.active,
    movementCount: l._count.movements,
  }));
}

export async function listPurposes(): Promise<PurposeRow[]> {
  const rows = await db.purpose.findMany({
    include: { _count: { select: { movements: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map((p) => ({ id: p.id, name: p.name, description: p.description, active: p.active, movementCount: p._count.movements }));
}

export async function listAuthorizers(): Promise<AuthorizerRow[]> {
  const rows = await db.authorizationPerson.findMany({
    include: { _count: { select: { movements: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map((a) => ({
    id: a.id,
    name: a.name,
    designation: a.designation,
    department: a.department,
    active: a.active,
    movementCount: a._count.movements,
  }));
}

export async function listDepartments(): Promise<Option[]> {
  return db.department.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
}
