import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border bg-card p-3", className)}>
      <header className="flex items-center gap-3 rounded-xl bg-muted/60 p-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
          <Icon className="size-6" />
        </span>
        <div className="min-w-0">
          <h3 className="text-[17px] font-bold leading-tight">{title}</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </header>
      <div className="px-2 pb-2 pt-4">{children}</div>
    </section>
  );
}

export function ToggleRow({
  title,
  text,
  children,
  icon: Icon,
}: {
  title: string;
  text: ReactNode;
  children: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex items-center gap-3 border-b py-2.5 last:border-b-0">
      {Icon && (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/70">
          <Icon className="size-4" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{text}</div>
      </div>
      {children}
    </div>
  );
}
