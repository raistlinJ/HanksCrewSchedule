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
        "border-green-700 bg-green-600 text-white shadow-sm dark:border-green-400 dark:bg-green-600 dark:text-white",
    },
    {
      type: "ifNeedBe" as const,
      label: t("ifNeedBe", { defaultValue: "If needed" }),
      selected:
        "border-amber-600 bg-amber-400 text-amber-950 shadow-sm dark:border-amber-400 dark:bg-amber-400 dark:text-amber-950",
    },
    {
      type: "no" as const,
      label: t("no", { defaultValue: "No" }),
      selected:
        "border-rose-700 bg-rose-600 text-white shadow-sm dark:border-rose-400 dark:bg-rose-600 dark:text-white",
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
              "flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg border-2 bg-background px-2 py-2 font-semibold text-xs shadow-xs transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40",
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
