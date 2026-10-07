"use client";

import { toast } from "sonner";

// Entry save / mark-IN success toasts respect Settings → "Show Success Notification".
// Errors and warnings are always shown.
let showSuccess = true;

export function setShowEntrySuccess(value: boolean) {
  showSuccess = value;
}

export function entrySuccess(message: string | undefined) {
  if (showSuccess && message) toast.success(message);
}
