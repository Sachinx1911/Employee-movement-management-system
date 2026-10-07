"use client";

import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

export type DeleteTarget = {
  label: string; // "employee", "location", ...
  name: string;
  active: boolean;
  movementCount: number;
  onDelete: () => Promise<ActionResult>;
  onSetActive: (active: boolean) => Promise<ActionResult>;
};

/**
 * Records used in movements are never deleted (reports must stay intact):
 * for them the dialog offers Deactivate / Activate instead.
 */
export function MasterDeleteDialog({ target, onClose }: { target: DeleteTarget | null; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const used = (target?.movementCount ?? 0) > 0;

  const run = (fn: () => Promise<ActionResult>) =>
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message);
        onClose();
      } else toast.error(r.error);
    });

  return (
    <AlertDialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        {target && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{used ? `${target.name} cannot be deleted` : `Delete ${target.name}?`}</AlertDialogTitle>
              <AlertDialogDescription>
                {used
                  ? `This ${target.label} is used in ${target.movementCount} movement record${target.movementCount === 1 ? "" : "s"}. To keep reports correct it can only be ${target.active ? "deactivated — it will be hidden from new entries but stay in old reports" : "re-activated"}.`
                  : `This ${target.label} is not used in any movement record. It will be permanently removed.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
              {used ? (
                <Button variant={target.active ? "destructive" : "default"} disabled={pending} onClick={() => run(() => target.onSetActive(!target.active))}>
                  {pending && <Loader2 className="animate-spin" />}
                  {target.active ? "Deactivate" : "Activate"}
                </Button>
              ) : (
                <Button className="bg-destructive text-white hover:bg-destructive/90" disabled={pending} onClick={() => run(target.onDelete)}>
                  {pending && <Loader2 className="animate-spin" />}
                  Delete
                </Button>
              )}
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
