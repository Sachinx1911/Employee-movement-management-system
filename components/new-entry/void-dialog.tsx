"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
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
import { Input } from "@/components/ui/input";
import { voidMovement } from "@/lib/actions/movements";

export function VoidDialog({ target, onClose }: { target: { id: string; label: string } | null; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  return (
    <AlertDialog
      open={!!target}
      onOpenChange={(o) => {
        if (!o) {
          setReason("");
          onClose();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
          <AlertDialogDescription>
            {target?.label}. The entry is removed from reports but kept in the audit log.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" maxLength={200} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button
            className="bg-destructive text-white hover:bg-destructive/90"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await voidMovement(target!.id, reason);
                if (r.ok) {
                  toast.success(r.message);
                  setReason("");
                  onClose();
                } else toast.error(r.error);
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />}
            Delete Entry
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
