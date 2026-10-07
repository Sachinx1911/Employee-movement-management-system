"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { Controller, useForm, type FieldPath, type FieldValues, type UseFormSetError } from "react-hook-form";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import { saveAuthorizer, saveLocation, savePurpose } from "@/lib/actions/masters";
import type { AuthorizerRow, LocationRow, Option, PurposeRow } from "@/lib/queries/masters";
import {
  authorizerSchema,
  locationSchema,
  purposeSchema,
  type AuthorizerInput,
  type LocationInput,
  type PurposeInput,
} from "@/lib/validations";
import { Field, FormFooter } from "./form-bits";

const NONE = "__none__";

function useSubmit<T extends FieldValues>(setError: UseFormSetError<T>, onClose: () => void) {
  const [saving, start] = useTransition();
  const submit = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message);
        onClose();
        return;
      }
      toast.error(r.error);
      for (const [field, message] of Object.entries(r.fieldErrors ?? {})) setError(field as FieldPath<T>, { message });
    });
  return { saving, submit };
}

function StatusSelect({ id, value, onChange }: { id: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Select value={value ? "active" : "inactive"} onValueChange={(v) => onChange(v === "active")}>
      <SelectTrigger id={id} className="h-10! w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="active">Active</SelectItem>
        <SelectItem value="inactive">Inactive</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function LocationForm({ row, purposes, onClose }: { row: LocationRow | null; purposes: Option[]; onClose: () => void }) {
  const form = useForm<LocationInput>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: row?.name ?? "",
      area: row?.area ?? "",
      city: row?.city ?? "",
      defaultPurposeId: row?.defaultPurposeId ?? "",
      active: row?.active ?? true,
    },
  });
  const { register, control, handleSubmit, setError, formState } = form;
  const { saving, submit } = useSubmit(setError, onClose);
  const e = formState.errors;

  return (
    <form onSubmit={handleSubmit((v) => submit(() => saveLocation(row?.id ?? null, v)))} className="flex h-full flex-col" noValidate>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <Field id="loc-name" label="Location Name" required error={e.name?.message}>
          <Input id="loc-name" className="h-10" placeholder="e.g. Kamothe or BOB - Vashi" autoFocus aria-invalid={!!e.name} {...register("name")} />
        </Field>
        <Field id="loc-area" label="Area" error={e.area?.message}>
          <Input id="loc-area" className="h-10" placeholder="Enter area" {...register("area")} />
        </Field>
        <Field id="loc-city" label="City" error={e.city?.message}>
          <Input id="loc-city" className="h-10" placeholder="Enter city" {...register("city")} />
        </Field>
        <Field id="loc-purpose" label="Default Purpose" error={e.defaultPurposeId?.message}>
          <Controller
            control={control}
            name="defaultPurposeId"
            render={({ field }) => (
              <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? "" : v)}>
                <SelectTrigger id="loc-purpose" className="h-10! w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No default</SelectItem>
                  {purposes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-xs text-muted-foreground">Pre-filled when this location is picked in a new entry.</p>
        </Field>
        <Field id="loc-status" label="Status">
          <Controller control={control} name="active" render={({ field }) => <StatusSelect id="loc-status" value={field.value} onChange={field.onChange} />} />
        </Field>
      </div>
      <FormFooter saving={saving} label={row ? "Update Location" : "Save Location"} onCancel={onClose} />
    </form>
  );
}

export function PurposeForm({ row, onClose }: { row: PurposeRow | null; onClose: () => void }) {
  const form = useForm<PurposeInput>({
    resolver: zodResolver(purposeSchema),
    defaultValues: { name: row?.name ?? "", description: row?.description ?? "", active: row?.active ?? true },
  });
  const { register, control, handleSubmit, setError, formState } = form;
  const { saving, submit } = useSubmit(setError, onClose);
  const e = formState.errors;

  return (
    <form onSubmit={handleSubmit((v) => submit(() => savePurpose(row?.id ?? null, v)))} className="flex h-full flex-col" noValidate>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <Field id="pur-name" label="Purpose Name" required error={e.name?.message}>
          <Input id="pur-name" className="h-10" placeholder="e.g. Bank Work" autoFocus aria-invalid={!!e.name} {...register("name")} />
        </Field>
        <Field id="pur-desc" label="Description" error={e.description?.message}>
          <Textarea id="pur-desc" rows={3} placeholder="Short description (optional)" {...register("description")} />
        </Field>
        <Field id="pur-status" label="Status">
          <Controller control={control} name="active" render={({ field }) => <StatusSelect id="pur-status" value={field.value} onChange={field.onChange} />} />
        </Field>
      </div>
      <FormFooter saving={saving} label={row ? "Update Purpose" : "Save Purpose"} onCancel={onClose} />
    </form>
  );
}

export function AuthorizerForm({ row, onClose }: { row: AuthorizerRow | null; onClose: () => void }) {
  const form = useForm<AuthorizerInput>({
    resolver: zodResolver(authorizerSchema),
    defaultValues: {
      name: row?.name ?? "",
      designation: row?.designation ?? "",
      department: row?.department ?? "",
      active: row?.active ?? true,
    },
  });
  const { register, control, handleSubmit, setError, formState } = form;
  const { saving, submit } = useSubmit(setError, onClose);
  const e = formState.errors;

  return (
    <form onSubmit={handleSubmit((v) => submit(() => saveAuthorizer(row?.id ?? null, v)))} className="flex h-full flex-col" noValidate>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <Field id="auth-name" label="Name" required error={e.name?.message}>
          <Input id="auth-name" className="h-10" placeholder="e.g. Satish Sir" autoFocus aria-invalid={!!e.name} {...register("name")} />
        </Field>
        <Field id="auth-desig" label="Designation" error={e.designation?.message}>
          <Input id="auth-desig" className="h-10" placeholder="Enter designation" {...register("designation")} />
        </Field>
        <Field id="auth-dept" label="Department" error={e.department?.message}>
          <Input id="auth-dept" className="h-10" placeholder="Enter department" {...register("department")} />
        </Field>
        <Field id="auth-status" label="Status">
          <Controller control={control} name="active" render={({ field }) => <StatusSelect id="auth-status" value={field.value} onChange={field.onChange} />} />
        </Field>
        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          When no one is selected in an entry, reports show <b>NIL</b> automatically.
        </p>
      </div>
      <FormFooter saving={saving} label={row ? "Update Person" : "Save Person"} onCancel={onClose} />
    </form>
  );
}
