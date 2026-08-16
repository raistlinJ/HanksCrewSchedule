"use client";

import { cn } from "@rallly/ui";
import { CheckIcon } from "lucide-react";

export function AuxiliaryOptionToggle({
  selected,
  onChange,
  disabled = false,
  optionLabel,
  className,
}: {
  selected: boolean;
  onChange: (selected: boolean) => void;
  disabled?: boolean;
  optionLabel: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={`${optionLabel}: ${selected ? "Selected" : "Not selected"}`}
      aria-pressed={selected}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 font-semibold text-xs shadow-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        selected
          ? "border-green-500 bg-green-500/15 text-green-800 dark:text-green-200"
          : "border-input bg-background hover:bg-muted",
        className,
      )}
      onClick={() => onChange(!selected)}
    >
      {selected ? <CheckIcon className="size-4" /> : null}
      {selected ? "Selected" : "Select"}
    </button>
  );
}
