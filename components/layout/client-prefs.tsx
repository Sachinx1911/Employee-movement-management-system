"use client";

import { setShowEntrySuccess } from "@/lib/notify";

/** Pushes server-side settings into client modules (rendered once in the layout). */
export function ClientPrefs({ showSuccessToast }: { showSuccessToast: boolean }) {
  setShowEntrySuccess(showSuccessToast);
  return null;
}
