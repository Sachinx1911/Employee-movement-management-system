// Shared Zod schemas — used by forms on the client and re-checked on the server.
import { z } from "zod";
import { isDateKey } from "@/lib/date-utils";

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`);

export const employeeSchema = z.object({
  name: z.string().trim().min(1, "Employee name is required").max(80, "Name is too long"),
  // Empty for a new employee: the server assigns the next EMP code.
  code: z
    .string()
    .trim()
    .max(20, "Code is too long")
    .regex(/^[A-Za-z0-9_\-/]*$/, "Use letters, numbers, - or / only"),
  departmentId: z.string().min(1, "Please select a department"),
  designation: optionalText(80, "Designation"),
  mobile: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[6-9]\d{9}$/.test(v), "Enter a valid 10-digit mobile number"),
  email: z
    .string()
    .trim()
    .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address"),
  joiningDate: z.string().refine((v) => v === "" || isDateKey(v), "Enter a valid date"),
  address: optionalText(300, "Address"),
  notes: optionalText(500, "Notes"),
  active: z.boolean(),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;

export const departmentNameSchema = z.string().trim().min(1, "Department name is required").max(60, "Name is too long");

/** Empty string → null, for optional DB columns. */
export function blankToNull(value: string | undefined | null): string | null {
  const v = value?.trim();
  return v ? v : null;
}

export const locationSchema = z.object({
  name: z.string().trim().min(1, "Location name is required").max(80, "Name is too long"),
  area: optionalText(80, "Area"),
  city: optionalText(80, "City"),
  defaultPurposeId: z.string(),
  active: z.boolean(),
});
export type LocationInput = z.infer<typeof locationSchema>;

export const purposeSchema = z.object({
  name: z.string().trim().min(1, "Purpose name is required").max(60, "Name is too long"),
  description: optionalText(200, "Description"),
  active: z.boolean(),
});
export type PurposeInput = z.infer<typeof purposeSchema>;

export const authorizerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60, "Name is too long"),
  designation: optionalText(80, "Designation"),
  department: optionalText(60, "Department"),
  active: z.boolean(),
});
export type AuthorizerInput = z.infer<typeof authorizerSchema>;
