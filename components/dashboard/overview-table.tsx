import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  href,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode;
  href?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-2xl border bg-card p-4", className)}>
      <div className="flex items-center justify-between gap-2 pb-3">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        {action}
        {href && (
          <Link
            href={href}
            className="flex h-8 items-center gap-1 rounded-lg border px-3 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
          >
            View All <ArrowRight className="size-3.5" />
          </Link>
        )}
      </div>
      <div className={cn("min-w-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}
