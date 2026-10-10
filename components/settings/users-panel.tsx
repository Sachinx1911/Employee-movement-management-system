"use client";

import { KeyRound, Loader2, Plus, ShieldCheck, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createUser, resetUserPassword, updateUser } from "@/lib/actions/settings";
import { isSuperAdmin, ROLE_LABEL, rolesUpTo, type Role } from "@/lib/roles";
import { SectionCard } from "./section-card";

export type UserRow = { id: string; name: string; username: string; role: Role; active: boolean };

export function UsersPanel({ users, meId, meRole }: { users: UserRow[]; meId: string; meRole: Role }) {
  const roles = rolesUpTo(meRole);
  const [adding, setAdding] = useState(false);
  const [resetFor, setResetFor] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ name: "", username: "", role: "STAFF" as Role, password: "" });
  const [newPassword, setNewPassword] = useState("");
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message);
        after?.();
      } else toast.error(r.error);
    });

  return (
    <SectionCard icon={ShieldCheck} title="Users & Access" subtitle={
        isSuperAdmin(meRole)
          ? "Who can sign in. SUPER ADMIN has every permission and manages admins; ADMIN has full access to data; STAFF can create OUT entries, mark IN and view daily reports."
          : "Who can sign in. ADMIN has full access; STAFF can create OUT entries, mark IN and view daily reports."
      }>
      <div className="mb-3 flex justify-end">
        <Button onClick={() => setAdding(true)}>
          <UserPlus /> Add User
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="bg-muted/70 text-left [&>th]:h-10 [&>th]:px-3 [&>th]:font-semibold">
              <th className="rounded-l-lg">Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th className="rounded-r-lg text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b [&>td]:h-12 [&>td]:px-3">
                <td className="font-medium">
                  {u.name} {u.id === meId && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                </td>
                <td className="font-mono text-xs">{u.username}</td>
                <td>
                  <Select value={u.role} onValueChange={(v) => run(() => updateUser(u.id, { role: v as UserRow["role"] }))} disabled={pending || u.id === meId}>
                    <SelectTrigger className="h-8! w-[130px]" aria-label={`Role of ${u.name}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td>
                  <StatusBadge kind={u.active ? "active" : "inactive"} />
                </td>
                <td>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setResetFor(u)}>
                      <KeyRound /> Reset Password
                    </Button>
                    <Button
                      variant={u.active ? "destructive" : "outline"}
                      size="sm"
                      disabled={pending || u.id === meId}
                      onClick={() => run(() => updateUser(u.id, { active: !u.active }))}
                    >
                      {u.active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>Share the username and password with the person; they can change the password after signing in.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => createUser(form), () => {
                setAdding(false);
                setForm({ name: "", username: "", role: "STAFF", password: "" });
              });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="u-name">Full Name</Label>
              <Input id="u-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-username">Username</Label>
              <Input id="u-username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required autoCapitalize="none" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-role">Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRow["role"] })}>
                <SelectTrigger id="u-role" className="h-9! w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...roles].reverse().map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-pass">Password</Label>
              <Input id="u-pass" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={10} autoComplete="new-password" />
              <p className="text-xs text-muted-foreground">At least 10 characters, with letters and numbers.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : <Plus />} Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetFor} onOpenChange={(o) => !o && setResetFor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>Set a new password for {resetFor?.name}. They will be signed out everywhere.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => resetUserPassword(resetFor!.id, newPassword), () => {
                setResetFor(null);
                setNewPassword("");
              });
            }}
          >
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min 10, letters + numbers)" minLength={10} required autoComplete="new-password" autoFocus />
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="animate-spin" />} Reset Password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
