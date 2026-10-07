"use client";

import { Clock } from "lucide-react";
import { useRef, useState } from "react";
import { toTimeInput } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { parseTime } from "./grid-model";
import { focusNext } from "./typeahead";

export function to12h(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/**
 * Typed time field — no scrolling picker. Accepts 1243, 12:43, 12:43 pm, 1.35, 7p.
 * Hours 1–7 typed without AM/PM are read as PM (office hours).
 */
export function TimeText({
  value,
  onChange,
  disabled,
  invalid,
  label,
  allowNow = true,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  label: string;
  allowNow?: boolean;
}) {
  const [text, setTextState] = useState<string | null>(null);
  const textRef = useRef<string | null>(null);
  const setText = (t: string | null) => {
    textRef.current = t;
    setTextState(t);
  };
  const [bad, setBad] = useState(false);

  const commit = () => {
    if (textRef.current === null) return;
    const raw = textRef.current.trim();
    setText(null);
    if (!raw) {
      setBad(false);
      if (value) onChange("");
      return;
    }
    const p = parseTime(raw, { assumePmBelow: 8 });
    if (!p) {
      setBad(true);
      return;
    }
    setBad(false);
    if (p !== value) onChange(p);
  };

  return (
    <div className="relative">
      <input
        data-grid-field
        type="text"
        inputMode="text"
        aria-label={label}
        autoComplete="off"
        disabled={disabled}
        data-invalid={invalid || bad || undefined}
        value={text ?? to12h(value)}
        placeholder="--:-- --"
        onFocus={(e) => {
          setText(to12h(value));
          requestAnimationFrame(() => e.target.select());
        }}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
            focusNext(e.currentTarget);
          } else if (e.key === "Escape") {
            setText(null);
            setBad(false);
            e.currentTarget.blur();
          }
        }}
        className={cn(
          "tabular h-9 w-full min-w-[112px] rounded-lg border bg-background pl-2.5 pr-8 text-sm outline-none transition-colors placeholder:text-muted-foreground",
          "hover:border-ring/60 focus:border-ring focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:bg-muted/60",
          "data-invalid:border-destructive data-invalid:ring-2 data-invalid:ring-destructive/15",
        )}
      />
      {allowNow && !disabled && (
        <button
          type="button"
          tabIndex={-1}
          title="Set to current time"
          aria-label={`Set ${label} to now`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setText(null);
            setBad(false);
            onChange(toTimeInput(new Date()));
          }}
          className="absolute right-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary"
        >
          <Clock className="size-4" />
        </button>
      )}
    </div>
  );
}
