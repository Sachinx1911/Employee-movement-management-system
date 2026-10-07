"use client";

import { Check, ChevronDown, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ComboOption = { value: string; label: string; hint?: string };

/**
 * Searchable select. `onCreate` (optional) adds a "+ Add “text”" item so a
 * new master value can be created while typing.
 */
export function ComboSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = "Search…",
  emptyText = "No match found.",
  onCreate,
  disabled,
  invalid,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ComboOption[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  onCreate?: (text: string) => Promise<string | null>;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const selected = options.find((o) => o.value === value);
  const trimmed = search.trim();
  const exact = options.some((o) => o.label.toLowerCase() === trimmed.toLowerCase());

  const create = async () => {
    if (!onCreate || !trimmed) return;
    setCreating(true);
    const id = await onCreate(trimmed);
    setCreating(false);
    if (id) {
      onChange(id);
      setOpen(false);
      setSearch("");
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSearch("");
      }}
    >
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          data-invalid={invalid || undefined}
          className={cn(
            "flex h-9 w-full min-w-0 items-center justify-between gap-1 rounded-lg border bg-background px-2.5 text-left text-sm outline-none transition-colors",
            "hover:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-muted/60 disabled:opacity-80",
            "data-invalid:border-destructive data-invalid:ring-2 data-invalid:ring-destructive/15",
            className,
          )}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>{selected?.label ?? placeholder}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>{onCreate && trimmed ? "No match — add it below." : emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={`${o.label} ${o.hint ?? ""} ${o.value}`}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check className={cn("size-4", o.value === value ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{o.label}</span>
                  {o.hint && <span className="ml-auto truncate pl-2 text-xs text-muted-foreground">{o.hint}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
            {onCreate && trimmed && !exact && (
              <CommandGroup forceMount>
                <CommandItem value={`__create__ ${trimmed}`} onSelect={create} disabled={creating} forceMount>
                  {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  Add “{trimmed}”
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
