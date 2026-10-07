"use client";

import { Loader2, Save } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function Field({
  id,
  label,
  required,
  error,
  children,
  action,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
        {action}
      </div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function FormFooter({ saving, label, onCancel }: { saving: boolean; label: string; onCancel: () => void }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-3 border-t px-5 py-4">
      <Button type="button" variant="outline" className="h-11 px-6" onClick={onCancel} disabled={saving}>
        Cancel
      </Button>
      <Button type="submit" className="h-11" disabled={saving}>
        {saving ? <Loader2 className="animate-spin" /> : <Save />}
        {label}
      </Button>
    </div>
  );
}
