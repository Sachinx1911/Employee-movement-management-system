"use client";

import { FileText, MapPin, MapPinned, User, UserCheck, Users, UsersRound, type LucideIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useCallback, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { deleteEmployee, setEmployeeActive } from "@/lib/actions/employees";
import { deleteMaster, setMasterActive } from "@/lib/actions/masters";
import type { AuthorizerRow, EmployeeRow, LocationRow, Option, PurposeRow } from "@/lib/queries/masters";
import { formatDateKey } from "@/lib/date-utils";
import { nextEmployeeCode } from "@/lib/employee-code";
import { cn } from "@/lib/utils";
import { EmployeeForm } from "./employee-form";
import { EmployeeViewDialog } from "./employee-view-dialog";
import { MasterCard } from "./master-card";
import { MasterDeleteDialog, type DeleteTarget } from "./master-delete-dialog";
import { AuthorizerForm, LocationForm, PurposeForm } from "./master-forms";

export type MasterTab = "employees" | "locations" | "purposes" | "authorizers";

const TABS: { id: MasterTab; label: string; icon: LucideIcon }[] = [
  { id: "employees", label: "Employees", icon: Users },
  { id: "locations", label: "Locations", icon: MapPin },
  { id: "purposes", label: "Purpose", icon: FileText },
  { id: "authorizers", label: "Authorized By", icon: UsersRound },
];

type Editing =
  | { tab: "employees"; row: EmployeeRow | null }
  | { tab: "locations"; row: LocationRow | null }
  | { tab: "purposes"; row: PurposeRow | null }
  | { tab: "authorizers"; row: AuthorizerRow | null };

const SHEET_TITLE: Record<MasterTab, [string, string]> = {
  employees: ["Add New Employee", "Edit Employee"],
  locations: ["Add New Location", "Edit Location"],
  purposes: ["Add New Purpose", "Edit Purpose"],
  authorizers: ["Add Authorized Person", "Edit Authorized Person"],
};

const dash = (v: string | null | undefined) => v || "—";

export function MasterDataView({
  initialTab,
  initialQuery,
  employees,
  locations,
  purposes,
  authorizers,
  departments: initialDepartments,
}: {
  initialTab: MasterTab;
  initialQuery: string;
  employees: EmployeeRow[];
  locations: LocationRow[];
  purposes: PurposeRow[];
  authorizers: AuthorizerRow[];
  departments: Option[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab") as MasterTab | null;
  const [pendingTab, setPendingTab] = useState<MasterTab | null>(null);
  const tab: MasterTab = pendingTab ?? (urlTab && TABS.some((t) => t.id === urlTab) ? urlTab : initialTab);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [viewing, setViewing] = useState<EmployeeRow | null>(null);
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);
  const [addedDepartments, setAddedDepartments] = useState<Option[]>([]);

  const departments = [...initialDepartments, ...addedDepartments.filter((d) => !initialDepartments.some((i) => i.id === d.id))].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const activePurposes = purposes.filter((p) => p.active).map(({ id, name }) => ({ id, name }));

  const selectTab = useCallback(
    (next: MasterTab) => {
      setPendingTab(next);
      const params = new URLSearchParams();
      params.set("tab", next);
      startTransition(() => {
        router.replace(`${pathname}?${params}`, { scroll: false });
        setPendingTab(null);
      });
    },
    [pathname, router],
  );

  const show = (t: MasterTab) => tab === t;
  const close = () => setEditing(null);

  const sheetTitle = editing ? SHEET_TITLE[editing.tab][editing.row ? 1 : 0] : "";
  const sheetKey = editing ? `${editing.tab}-${editing.row?.id ?? "new"}` : "none";

  return (
    <>
      <div className="mb-5">
        <h2 className="text-2xl font-bold tracking-tight sm:text-[28px]">Master Data</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manage Employees, Locations, Purpose and Authorized By from a single place.</p>
      </div>

      <div role="tablist" aria-label="Master data sections" className="mb-5 grid grid-cols-2 gap-2 rounded-xl border bg-card p-1 sm:grid-cols-4">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => selectTab(id)}
            className={cn(
              "flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors sm:text-[15px]",
              tab === id ? "bg-primary text-white shadow-sm" : "text-foreground/80 hover:bg-muted",
            )}
          >
            <Icon className="size-[18px]" />
            {label}
          </button>
        ))}
      </div>

      <div>
        {show("employees") && (
          <MasterCard<EmployeeRow>
            key={`employees-${initialQuery}`}
            initialQuery={initialTab === "employees" ? initialQuery : ""}
            title="Employees"
            subtitle="Add, edit or manage employee details."
            icon={User}
            countIcon={Users}
            tone="blue"
            countLabel="Total Employees"
            noun="employees"
            addLabel="Add Employee"
            searchPlaceholder="Search by name, code, department or mobile..."
            rows={employees}
            searchText={(e) => [e.name, e.code, e.departmentName, e.designation, e.mobile].join(" ")}
            columns={[
              {
                header: "Name",
                cell: (e) => (
                  <button type="button" onClick={() => setViewing(e)} className="font-medium text-foreground hover:text-primary hover:underline">
                    {e.name}
                  </button>
                ),
              },
              { header: "Code", cell: (e) => <span className="tabular">{dash(e.code)}</span> },
              { header: "Department", cell: (e) => dash(e.departmentName) },
              { header: "Designation", cell: (e) => <span title={e.designation ?? ""}>{dash(e.designation)}</span> },
              { header: "Mobile", cell: (e) => <span className="tabular">{dash(e.mobile)}</span> },
              { header: "Email", cell: (e) => dash(e.email) },
              { header: "Joining Date", cell: (e) => <span className="tabular">{e.joiningDate ? formatDateKey(e.joiningDate) : "—"}</span> },
            ]}
            onAdd={() => setEditing({ tab: "employees", row: null })}
            onEdit={(row) => setEditing({ tab: "employees", row })}
            onDelete={(e) =>
              setDeleting({
                label: "employee",
                name: e.name,
                active: e.active,
                movementCount: e.movementCount,
                onDelete: () => deleteEmployee(e.id),
                onSetActive: (active) => setEmployeeActive(e.id, active),
              })
            }
          />
        )}

        {show("locations") && (
          <MasterCard<LocationRow>
            key={`locations-${initialQuery}`}
            initialQuery={initialTab === "locations" ? initialQuery : ""}
            title="Locations"
            subtitle="Manage visit locations / places."
            icon={MapPinned}
            countIcon={MapPin}
            tone="green"
            countLabel="Total Locations"
            noun="locations"
            addLabel="Add Location"
            searchPlaceholder="Search by location name or area..."
            rows={locations}
            searchText={(l) => [l.name, l.area, l.city, l.defaultPurposeName].join(" ")}
            columns={[
              { header: "Location Name", cell: (l) => <span title={l.name} className="font-medium text-foreground">{l.name}</span> },
              { header: "Area", cell: (l) => dash(l.area) },
              { header: "City", cell: (l) => dash(l.city) },
              { header: "Default Purpose", cell: (l) => dash(l.defaultPurposeName) },
              { header: "Visits", cell: (l) => <span className="tabular">{l.movementCount}</span> },
            ]}
            onAdd={() => setEditing({ tab: "locations", row: null })}
            onEdit={(row) => setEditing({ tab: "locations", row })}
            onDelete={(l) =>
              setDeleting({
                label: "location",
                name: l.name,
                active: l.active,
                movementCount: l.movementCount,
                onDelete: () => deleteMaster("location", l.id),
                onSetActive: (active) => setMasterActive("location", l.id, active),
              })
            }
          />
        )}

        {show("purposes") && (
          <MasterCard<PurposeRow>
            key={`purposes-${initialQuery}`}
            initialQuery={initialTab === "purposes" ? initialQuery : ""}
            title="Purpose"
            subtitle="Manage purpose types for movements."
            icon={FileText}
            countIcon={FileText}
            tone="purple"
            countLabel="Total Purposes"
            noun="purposes"
            addLabel="Add Purpose"
            searchPlaceholder="Search by purpose name..."
            rows={purposes}
            searchText={(p) => [p.name, p.description].join(" ")}
            columns={[
              { header: "Purpose Name", cell: (p) => <span className="font-medium text-foreground">{p.name}</span> },
              { header: "Description", cell: (p) => dash(p.description) },
              { header: "Used In", cell: (p) => <span className="tabular">{p.movementCount} entries</span> },
            ]}
            onAdd={() => setEditing({ tab: "purposes", row: null })}
            onEdit={(row) => setEditing({ tab: "purposes", row })}
            onDelete={(p) =>
              setDeleting({
                label: "purpose",
                name: p.name,
                active: p.active,
                movementCount: p.movementCount,
                onDelete: () => deleteMaster("purpose", p.id),
                onSetActive: (active) => setMasterActive("purpose", p.id, active),
              })
            }
          />
        )}

        {show("authorizers") && (
          <MasterCard<AuthorizerRow>
            key={`authorizers-${initialQuery}`}
            initialQuery={initialTab === "authorizers" ? initialQuery : ""}
            title="Authorized By"
            subtitle="Manage authorized persons."
            icon={UsersRound}
            countIcon={UserCheck}
            tone="orange"
            countLabel="Total Persons"
            noun="authorized persons"
            addLabel="Add Person"
            searchPlaceholder="Search by name..."
            rows={authorizers}
            searchText={(a) => [a.name, a.designation, a.department].join(" ")}
            columns={[
              { header: "Name", cell: (a) => <span className="font-medium text-foreground">{a.name}</span> },
              { header: "Designation", cell: (a) => dash(a.designation) },
              { header: "Department", cell: (a) => dash(a.department) },
              { header: "Used In", cell: (a) => <span className="tabular">{a.movementCount} entries</span> },
            ]}
            onAdd={() => setEditing({ tab: "authorizers", row: null })}
            onEdit={(row) => setEditing({ tab: "authorizers", row })}
            onDelete={(a) =>
              setDeleting({
                label: "authorized person",
                name: a.name,
                active: a.active,
                movementCount: a.movementCount,
                onDelete: () => deleteMaster("authorizer", a.id),
                onSetActive: (active) => setMasterActive("authorizer", a.id, active),
              })
            }
          />
        )}
      </div>

      <Sheet open={!!editing} onOpenChange={(open) => !open && close()}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetTitle className="px-5 pb-2 pt-5 text-lg">{sheetTitle}</SheetTitle>
          <div key={sheetKey} className="min-h-0 flex-1">
            {editing?.tab === "employees" && (
              <EmployeeForm
                employee={editing.row}
                nextCode={nextEmployeeCode(employees.map((e) => e.code))}
                departments={departments}
                onDepartmentAdded={(d) => setAddedDepartments((prev) => [...prev, d])}
                onClose={close}
              />
            )}
            {editing?.tab === "locations" && <LocationForm row={editing.row} purposes={activePurposes} onClose={close} />}
            {editing?.tab === "purposes" && <PurposeForm row={editing.row} onClose={close} />}
            {editing?.tab === "authorizers" && <AuthorizerForm row={editing.row} onClose={close} />}
          </div>
        </SheetContent>
      </Sheet>

      <EmployeeViewDialog employee={viewing} onOpenChange={(open) => !open && setViewing(null)} />
      <MasterDeleteDialog target={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}
