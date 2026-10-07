"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, Plus, Save, X } from "lucide-react";
import { useState, useTransition } from "react";
import { Controller, useForm, type FieldPath } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createDepartment, saveEmployee } from "@/lib/actions/employees";
import { todayKey } from "@/lib/date-utils";
import type { EmployeeRow } from "@/lib/queries/masters";
import { cn } from "@/lib/utils";
import { employeeSchema, type EmployeeInput } from "@/lib/validations";

export type Department = { id: string; name: string };

const BASIC_FIELDS: FieldPath<EmployeeInput>[] = ["name", "code", "departmentId", "designation", "mobile", "email", "joiningDate", "active"];

function defaults(e?: EmployeeRow | null): EmployeeInput {
  return {
    name: e?.name ?? "",
    code: e?.code ?? "",
    departmentId: e?.departmentId ?? "",
    designation: e?.designation ?? "",
    mobile: e?.mobile ?? "",
    email: e?.email ?? "",
    joiningDate: e ? (e.joiningDate ?? "") : todayKey(),
    address: e?.address ?? "",
    notes: e?.notes ?? "",
    active: e?.active ?? true,
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function EmployeeForm({
  employee,
  departments,
  onDepartmentAdded,
  onClose,
}: {
  employee: EmployeeRow | null;
  departments: Department[];
  onDepartmentAdded: (d: Department) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState("basic");
  const [saving, startSaving] = useTransition();
  const form = useForm<EmployeeInput>({ resolver: zodResolver(employeeSchema), defaultValues: defaults(employee) });
  const { register, control, handleSubmit, setError, setValue, formState } = form;
  const errors = formState.errors;

  const [addingDept, setAddingDept] = useState(false);
  const [deptName, setDeptName] = useState("");
  const [deptSaving, startDeptSaving] = useTransition();

  const onSubmit = handleSubmit((values) => {
    startSaving(async () => {
      const result = await saveEmployee(employee?.id ?? null, values);
      if (result.ok) {
        toast.success(result.message);
        onClose();
        return;
      }
      toast.error(result.error);
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(field as FieldPath<EmployeeInput>, { message });
      }
      if (Object.keys(result.fieldErrors ?? {}).some((f) => BASIC_FIELDS.includes(f as FieldPath<EmployeeInput>))) setTab("basic");
    });
  }, (errs) => {
    const first = Object.keys(errs)[0] as FieldPath<EmployeeInput> | undefined;
    setTab(first && !BASIC_FIELDS.includes(first) ? "additional" : "basic");
  });

  const addDepartment = () => {
    startDeptSaving(async () => {
      const result = await createDepartment(deptName);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onDepartmentAdded(result.data!);
      setValue("departmentId", result.data!.id, { shouldValidate: true, shouldDirty: true });
      setAddingDept(false);
      setDeptName("");
      toast.success(result.message);
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex h-full flex-col" noValidate>
      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-0">
        <TabsList variant="line" className="w-full justify-start gap-2 border-b px-5">
          <TabsTrigger value="basic" className="flex-none px-3">Basic Details</TabsTrigger>
          <TabsTrigger value="additional" className="flex-none px-3">Additional Details</TabsTrigger>
        </TabsList>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="emp-name">
                Employee Name <span className="text-destructive">*</span>
              </Label>
              <Input id="emp-name" placeholder="Enter employee name" className="h-10" aria-invalid={!!errors.name} autoFocus {...register("name")} />
              <FieldError message={errors.name?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emp-code">
                Employee Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="emp-code"
                placeholder="Enter employee code"
                className="h-10 uppercase placeholder:normal-case"
                aria-invalid={!!errors.code}
                {...register("code")}
              />
              <FieldError message={errors.code?.message} />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="emp-dept">
                  Department <span className="text-destructive">*</span>
                </Label>
                {!addingDept && (
                  <button type="button" onClick={() => setAddingDept(true)} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    <Plus className="size-3" /> New
                  </button>
                )}
              </div>
              {addingDept ? (
                <div className="flex gap-2">
                  <Input
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addDepartment();
                      }
                      if (e.key === "Escape") setAddingDept(false);
                    }}
                    placeholder="New department name"
                    className="h-10"
                    autoFocus
                  />
                  <Button type="button" size="icon-lg" className="size-10" onClick={addDepartment} disabled={deptSaving || !deptName.trim()} aria-label="Add department">
                    {deptSaving ? <Loader2 className="animate-spin" /> : <Check />}
                  </Button>
                  <Button type="button" size="icon-lg" variant="outline" className="size-10" onClick={() => setAddingDept(false)} aria-label="Cancel">
                    <X />
                  </Button>
                </div>
              ) : (
                <Controller
                  control={control}
                  name="departmentId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="emp-dept" className="h-10! w-full" aria-invalid={!!errors.departmentId}>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
              <FieldError message={errors.departmentId?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emp-designation">Designation</Label>
              <Input id="emp-designation" placeholder="Enter designation" className="h-10" {...register("designation")} />
              <FieldError message={errors.designation?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emp-mobile">Mobile Number</Label>
              <Input
                id="emp-mobile"
                inputMode="numeric"
                maxLength={10}
                placeholder="Enter mobile number"
                className="h-10"
                aria-invalid={!!errors.mobile}
                {...register("mobile")}
              />
              <FieldError message={errors.mobile?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emp-email">Email ID</Label>
              <Input id="emp-email" type="email" placeholder="Enter email address" className="h-10" aria-invalid={!!errors.email} {...register("email")} />
              <FieldError message={errors.email?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emp-doj">Date of Joining</Label>
              <Input id="emp-doj" type="date" className="h-10" aria-invalid={!!errors.joiningDate} {...register("joiningDate")} />
              <FieldError message={errors.joiningDate?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emp-status">Status</Label>
              <Controller
                control={control}
                name="active"
                render={({ field }) => (
                  <Select value={field.value ? "active" : "inactive"} onValueChange={(v) => field.onChange(v === "active")}>
                    <SelectTrigger id="emp-status" className="h-10! w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.active?.message} />
            </div>
          </TabsContent>

          <TabsContent value="additional" className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="emp-address">Address</Label>
              <Textarea id="emp-address" rows={3} placeholder="Residential address (optional)" {...register("address")} />
              <FieldError message={errors.address?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-notes">Notes</Label>
              <Textarea id="emp-notes" rows={4} placeholder="Any internal notes (optional)" {...register("notes")} />
              <FieldError message={errors.notes?.message} />
            </div>
            {employee && (
              <p className={cn("rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground")}>
                {employee.movementCount} movement record{employee.movementCount === 1 ? "" : "s"} linked to this employee.
              </p>
            )}
          </TabsContent>
        </div>
      </Tabs>

      <div className="grid grid-cols-[auto_1fr] gap-3 border-t px-5 py-4">
        <Button type="button" variant="outline" className="h-11 px-6" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" className="h-11" disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          {employee ? "Update Employee" : "Save Employee"}
        </Button>
      </div>
    </form>
  );
}
