"use client";

import { Loader2, Plus } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type TypeOption = { value: string; label: string; hint?: string };

function rank(options: TypeOption[], text: string): TypeOption[] {
  const q = text.trim().toLowerCase();
  if (!q) return options;
  const starts: TypeOption[] = [];
  const words: TypeOption[] = [];
  const contains: TypeOption[] = [];
  for (const o of options) {
    const l = o.label.toLowerCase();
    const h = o.hint?.toLowerCase() ?? "";
    if (l.startsWith(q) || h.startsWith(q)) starts.push(o);
    else if (l.split(/[\s\-/]+/).some((w) => w.startsWith(q))) words.push(o);
    else if (l.includes(q) || h.includes(q)) contains.push(o);
  }
  return [...starts, ...words, ...contains];
}

/** Dice coefficient on letter pairs — catches typos like "saite vist" ≈ "Site Visit". */
function similarity(a: string, b: string) {
  const pairs = (t: string) => {
    const x = t.toLowerCase().replace(/[^a-z0-9]/g, "");
    const out: string[] = [];
    for (let i = 0; i < x.length - 1; i++) out.push(x.slice(i, i + 2));
    return out;
  };
  const pa = pairs(a);
  const pb = pairs(b);
  if (!pa.length || !pb.length) return 0;
  const pool = [...pb];
  let hit = 0;
  for (const p of pa) {
    const i = pool.indexOf(p);
    if (i >= 0) {
      hit++;
      pool.splice(i, 1);
    }
  }
  return (2 * hit) / (pa.length + pb.length);
}

/** Move focus to the next focusable field (used for Enter = next cell). */
export function focusNext(from: HTMLElement) {
  const all = Array.from(document.querySelectorAll<HTMLElement>("[data-grid-field]:not([disabled])"));
  const i = all.indexOf(from);
  all[i + 1]?.focus();
}

/**
 * Spreadsheet-style picker: type a few letters, Tab/Enter takes the best match.
 * With `onCreate`, unknown text is added as a new master value on Tab/Enter/blur.
 */
export function Typeahead({
  value,
  onChange,
  options,
  placeholder,
  onCreate,
  disabled,
  invalid,
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: TypeOption[];
  placeholder: string;
  onCreate?: (text: string) => Promise<string | null>;
  disabled?: boolean;
  invalid?: boolean;
  ariaLabel: string;
  className?: string;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";
  const [text, setTextState] = useState<string | null>(null); // null = not editing
  const textRef = useRef<string | null>(null);
  const setText = (t: string | null) => {
    textRef.current = t;
    setTextState(t);
  };
  const [active, setActive] = useState(0);
  const [creating, setCreating] = useState(false);
  const editing = text !== null;
  const matches = useMemo(() => (editing ? rank(options, text).slice(0, 8) : []), [editing, options, text]);
  const exact = editing && options.some((o) => o.label.toLowerCase() === text.trim().toLowerCase());

  /** Resolve what was typed into a value; returns once done. */
  const commit = async (pick?: TypeOption) => {
    const current = textRef.current;
    if (current === null) return; // already committed (Enter then blur)
    const typed = current.trim();
    setText(null);
    if (pick) {
      if (pick.value !== value) onChange(pick.value);
      return;
    }
    if (!typed) {
      if (value) onChange("");
      return;
    }
    if (typed.toLowerCase() === selectedLabel.toLowerCase()) return;
    const best = matches[Math.min(active, matches.length - 1)];
    const exactMatch = options.find((o) => o.label.toLowerCase() === typed.toLowerCase());
    if (exactMatch) return onChange(exactMatch.value);
    // New value wins over a fuzzy match only when creation is allowed and the
    // typed text is not a prefix of the best match.
    if (onCreate && (!best || !best.label.toLowerCase().startsWith(typed.toLowerCase()))) {
      const similar = options
        .map((o) => ({ o, score: similarity(typed, o.label) }))
        .filter((x) => x.score >= 0.5)
        .sort((a, b) => b.score - a.score)[0]?.o;
      if (similar) {
        const useExisting = window.confirm(`“${typed}” is not in the list.

Did you mean “${similar.label}”?

OK = use “${similar.label}”
Cancel = add “${typed}” as new`);
        if (useExisting) return onChange(similar.value);
      }
      setCreating(true);
      const id = await onCreate(typed);
      setCreating(false);
      if (id) onChange(id);
      return;
    }
    if (best) onChange(best.value);
  };

  const showList = editing && (matches.length > 0 || (!!onCreate && !!text.trim() && !exact));

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        data-grid-field
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        data-invalid={invalid || undefined}
        value={editing ? text : selectedLabel}
        placeholder={placeholder}
        onFocus={(e) => {
          setText(selectedLabel);
          setActive(0);
          requestAnimationFrame(() => e.target.select());
        }}
        onChange={(e) => {
          setText(e.target.value);
          setActive(0);
        }}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (!editing) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, Math.max(matches.length - 1, 0)));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const el = e.currentTarget;
            void commit().then(() => focusNext(el));
          } else if (e.key === "Escape") {
            setText(null);
            e.currentTarget.blur();
          }
          // Tab: let the browser move focus; onBlur commits the best match.
        }}
        className={cn(
          "h-9 w-full min-w-0 rounded-lg border bg-background px-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground",
          "hover:border-ring/60 focus:border-ring focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:bg-muted/60",
          "data-invalid:border-destructive data-invalid:ring-2 data-invalid:ring-destructive/15",
        )}
      />
      {creating && <Loader2 className="absolute right-2 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 top-10 z-50 max-h-64 min-w-full overflow-y-auto rounded-lg border bg-popover p-1 text-sm shadow-lg"
          onMouseDown={(e) => e.preventDefault()}
        >
          {matches.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => {
                void commit(o);
                inputRef.current?.blur();
              }}
              className={cn("flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-md px-2 py-1.5", i === active && "bg-accent text-accent-foreground")}
            >
              <span className="truncate">{o.label}</span>
              {o.hint && <span className="ml-auto pl-3 text-xs text-muted-foreground">{o.hint}</span>}
            </li>
          ))}
          {onCreate && text?.trim() && !exact && (
            <li className="flex items-center gap-2 whitespace-nowrap rounded-md px-2 py-1.5 text-primary">
              <Plus className="size-3.5" /> New: “{text.trim()}”{matches.length ? " — type the full name to add" : " — press Tab to add"}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
