import { cn } from "@/lib/utils";

type StatusKind = "active" | "inactive" | "completed" | "pending";

const STYLES: Record<StatusKind, { box: string; dot: string; label: string }> = {
  active: { box: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500", label: "Active" },
  inactive: { box: "bg-red-50 text-red-600", dot: "bg-red-500", label: "Inactive" },
  completed: { box: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500", label: "Completed" },
  pending: { box: "bg-amber-50 text-amber-600", dot: "bg-amber-500", label: "Pending IN" },
};

export function StatusBadge({ kind, label, className }: { kind: StatusKind; label?: string; className?: string }) {
  const s = STYLES[kind];
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-xs font-medium", s.box, className)}>
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {label ?? s.label}
    </span>
  );
}

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-indigo-500",
  "bg-rose-500",
  "bg-teal-500",
];

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export function NameAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white",
        AVATAR_COLORS[hash(name) % AVATAR_COLORS.length],
        className,
      )}
      aria-hidden
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
