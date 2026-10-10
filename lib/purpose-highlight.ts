// Purposes that are highlighted in reports so non-work time stands out.
// Matched by name, so "Lunch", "Lunch Break" or "Personal Work" all count.

export type PurposeKind = "lunch" | "personal";

export function purposeKind(purpose: string | null | undefined): PurposeKind | null {
  const p = purpose?.toLowerCase() ?? "";
  if (p.includes("lunch")) return "lunch";
  if (p.includes("personal")) return "personal";
  return null;
}

export const PURPOSE_KIND_LABEL: Record<PurposeKind, string> = {
  lunch: "Lunch",
  personal: "Personal Work",
};

/** Excel fill colours (ARGB) matching the on-screen highlight. */
export const PURPOSE_KIND_ARGB: Record<PurposeKind, string> = {
  lunch: "FFFFEDD5", // orange-100
  personal: "FFEDE9FE", // violet-100
};
