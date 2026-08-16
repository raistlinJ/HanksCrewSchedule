"use client";

import { cn } from "@rallly/ui";
import { useTranslation } from "@/i18n/client";
import VoteIcon from "./vote-icon";

type VoteType = "yes" | "no" | "ifNeedBe";

export function VoteButtonGroup({
  value,
  onChange,
  yesDisabled = false,
  disabled = false,
  className,
  optionLabel,
}: {
  value?: VoteType;
  onChange: (value: VoteType) => void;
  yesDisabled?: boolean;
  disabled?: boolean;
  className?: string;
  optionLabel?: string;
}) {
  const { t } = useTranslation();
  const choices = [
    {
      type: "yes" as const,
      label: t("yes", { defaultValue: "Yes" }),
      selected:
        "border-green-500 bg-green-500/15 text-green-800 dark:text-green-200",
    },
    {
      type: "ifNeedBe" as const,
      label: t("ifNeedBe", { defaultValue: "If needed" }),
      selected:
        "border-amber-500 bg-amber-500/15 text-amber-900 dark:text-amber-200",
    },
    {
      type: "no" as const,
      label: t("no", { defaultValue: "No" }),
      selected:
        "border-rose-500 bg-rose-500/10 text-rose-800 dark:text-rose-200",
    },
  ];

  return (
    <div className={cn("grid w-full grid-cols-3 gap-2", className)}>
      {choices.map((choice) => {
        const isDisabled = disabled || (choice.type === "yes" && yesDisabled);
        return (
          <button
            key={choice.type}
            type="button"
            aria-label={
              optionLabel ? `${optionLabel}: ${choice.label}` : choice.label
            }
            aria-pressed={value === choice.type}
            disabled={isDisabled}
            className={cn(
              "flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg border bg-background px-2 py-2 font-semibold text-xs shadow-xs transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40",
              value === choice.type
                ? choice.selected
                : "border-input hover:bg-muted",
            )}
            onClick={() => onChange(choice.type)}
          >
            <VoteIcon type={choice.type} />
            <span className="leading-tight">{choice.label}</span>
          </button>
        );
      })}
    </div>
  );
}
