"use client";

import { Check, Loader2, Lock, RotateCcw, Save, ShieldCheck } from "lucide-react";
import { Fragment, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { saveRolePermissions } from "@/lib/actions/settings";
import { DEFAULT_ROLE_PERMISSIONS, EDITABLE_ROLES, PERMISSION_GROUPS, type EditableRole, type Permission, type RolePermissions } from "@/lib/permissions";
import { ROLE_LABEL } from "@/lib/roles";
import { SectionCard } from "./section-card";

export function PermissionsPanel({ initial }: { initial: RolePermissions }) {
  const [saved, setSaved] = useState(initial);
  const [value, setValue] = useState(initial);
  const [pending, start] = useTransition();
  const dirty = EDITABLE_ROLES.some((r) => [...value[r]].sort().join() !== [...saved[r]].sort().join());

  const toggle = (role: EditableRole, perm: Permission, on: boolean) =>
    setValue((v) => ({ ...v, [role]: on ? [...v[role], perm] : v[role].filter((p) => p !== perm) }));

  const save = () =>
    start(async () => {
      const r = await saveRolePermissions(value);
      if (r.ok) {
        setSaved(value);
        toast.success(r.message);
      } else toast.error(r.error);
    });

  return (
    <SectionCard
      icon={ShieldCheck}
      title="Roles & Permissions"
      subtitle="Choose what each role can do. Super Admin always has every access; only the Super Admin can see this page."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="bg-muted/70 text-left [&>th]:h-11 [&>th]:px-3 [&>th]:font-semibold">
              <th className="rounded-l-lg">Access</th>
              <th className="w-32 text-center">{ROLE_LABEL.SUPER_ADMIN}</th>
              {EDITABLE_ROLES.map((r, i) => (
                <th key={r} className={i === EDITABLE_ROLES.length - 1 ? "w-28 rounded-r-lg text-center" : "w-28 text-center"}>
                  {ROLE_LABEL[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_GROUPS.map((g) => (
              <Fragment key={g.group}>
                <tr>
                  <td colSpan={2 + EDITABLE_ROLES.length} className="px-3 pb-1 pt-5 text-xs font-bold uppercase tracking-wide text-primary">
                    {g.group}
                  </td>
                </tr>
                {g.items.map((item) => (
                  <tr key={item.key} className="border-b last:border-b-0 [&>td]:px-3 [&>td]:py-2.5">
                    <td>
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs text-muted-foreground">{item.hint}</div>
                    </td>
                    <td className="text-center">
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700" title="Super Admin always has this">
                        <Check className="size-3.5" /> Always
                      </span>
                    </td>
                    {EDITABLE_ROLES.map((r) => (
                      <td key={r} className="text-center">
                        <Switch
                          checked={value[r].includes(item.key)}
                          onCheckedChange={(on) => toggle(r, item.key, on)}
                          aria-label={`${item.label} for ${ROLE_LABEL[r]}`}
                          disabled={pending}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
            <tr className="[&>td]:px-3 [&>td]:py-2.5">
              <td>
                <div className="flex items-center gap-1.5 font-medium">
                  <Lock className="size-3.5" /> Roles & Permissions, Super Admin accounts
                </div>
                <div className="text-xs text-muted-foreground">Fixed: only the Super Admin. Admins and Staff never see super admin accounts or their activity.</div>
              </td>
              <td className="text-center">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  <Check className="size-3.5" /> Always
                </span>
              </td>
              {EDITABLE_ROLES.map((r) => (
                <td key={r} className="text-center text-xs text-muted-foreground">
                  Never
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t pt-4">
        {dirty && <span className="mr-auto text-sm text-muted-foreground">You have unsaved changes</span>}
        <Button variant="outline" onClick={() => setValue(DEFAULT_ROLE_PERMISSIONS)} disabled={pending}>
          <RotateCcw /> Reset to Default
        </Button>
        <Button onClick={save} disabled={pending || !dirty}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Save Permissions
        </Button>
      </div>
    </SectionCard>
  );
}
