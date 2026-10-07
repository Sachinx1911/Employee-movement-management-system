import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return <Building2 className={cn("size-8 shrink-0 text-white", className)} strokeWidth={1.8} aria-hidden />;
}

export function Brand({ dark = true, name = "DDSR GROUP", logo }: { dark?: boolean; name?: string; logo?: string | null }) {
  return (
    <div className="flex items-center gap-2.5">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL from settings
        <img src={logo} alt="" className="size-9 shrink-0 rounded-md bg-white object-contain p-0.5" />
      ) : (
        <BrandMark className={dark ? "text-white" : "text-navy"} />
      )}
      <div className={cn("truncate text-xl font-bold tracking-wide", dark ? "text-white" : "text-navy")}>{name}</div>
    </div>
  );
}

/** Faint skyline drawn behind the lower part of the sidebar. */
export function SidebarSkyline() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 250 220"
      preserveAspectRatio="xMidYMax slice"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[260px] w-full text-white opacity-[0.06]"
    >
      <g fill="currentColor">
        <rect x="8" y="110" width="44" height="110" />
        <rect x="58" y="60" width="52" height="160" />
        <rect x="116" y="20" width="58" height="200" />
        <rect x="180" y="80" width="62" height="140" />
      </g>
      <g fill="#17365d">
        {Array.from({ length: 9 }).flatMap((_, row) =>
          [124, 140, 156].map((x) => <rect key={`a${row}-${x}`} x={x} y={32 + row * 20} width="8" height="10" />),
        )}
        {Array.from({ length: 7 }).flatMap((_, row) =>
          [66, 82, 96].map((x) => <rect key={`b${row}-${x}`} x={x} y={72 + row * 20} width="8" height="10" />),
        )}
        {Array.from({ length: 6 }).flatMap((_, row) =>
          [190, 206, 222].map((x) => <rect key={`c${row}-${x}`} x={x} y={92 + row * 20} width="8" height="10" />),
        )}
      </g>
    </svg>
  );
}
