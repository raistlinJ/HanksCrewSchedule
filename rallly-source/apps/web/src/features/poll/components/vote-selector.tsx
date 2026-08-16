import type { VoteType } from "@rallly/database";
import { buttonVariants, cn } from "@rallly/ui";
import * as React from "react";

import { useTranslation } from "@/i18n/client";

import VoteIcon from "./vote-icon";

export interface VoteSelectorProps {
  value?: VoteType;
  /**
   * Accessible description of the option being voted on (e.g. "Tue 30 Jun
   * 2026, 1:00 PM – 2:00 PM") so screen readers can tie the vote to its
   * date/time.
   */
  optionLabel?: string;
  onChange?: (value: VoteType) => void;
  onFocus?: React.FocusEventHandler<HTMLButtonElement>;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLButtonElement>;
  className?: string;
  yesDisabled?: boolean;
  disabled?: boolean;
}

const orderedVoteTypes: VoteType[] = ["yes", "ifNeedBe", "no"];

export const toggleVote = (value?: VoteType, yesDisabled = false): VoteType => {
  const availableVoteTypes = yesDisabled
    ? orderedVoteTypes.filter((type) => type !== "yes")
    : orderedVoteTypes;
  if (!value || !availableVoteTypes.includes(value)) {
    return availableVoteTypes[0] ?? "ifNeedBe";
  }
  const currentIndex = availableVoteTypes.indexOf(value);
  return (
    availableVoteTypes[(currentIndex + 1) % availableVoteTypes.length] ??
    "ifNeedBe"
  );
};

export const VoteSelector = React.forwardRef<
  HTMLButtonElement,
  VoteSelectorProps
>(function VoteSelector(
  {
    value,
    optionLabel,
    onChange,
    onFocus,
    onBlur,
    onKeyDown,
    className,
    yesDisabled = false,
    disabled = false,
  },
  ref,
) {
  const { t } = useTranslation();

  const voteLabel = (() => {
    switch (value) {
      case "yes":
        return t("yes", { defaultValue: "Yes" });
      case "ifNeedBe":
        return t("ifNeedBe", { defaultValue: "If need be" });
      case "no":
        return t("no", { defaultValue: "No" });
      default:
        return t("pending", { defaultValue: "Pending" });
    }
  })();

  return (
    <button
      data-testid="vote-selector"
      type="button"
      disabled={disabled}
      aria-label={`${optionLabel ? `${optionLabel}, ` : ""}${voteLabel}${
        yesDisabled ? "; Yes is full" : ""
      }`}
      title={
        yesDisabled
          ? t("yesResponseLimitReached", {
              defaultValue: "Yes is full; If needed and No are still available",
            })
          : undefined
      }
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      className={cn(
        buttonVariants({
          size: "icon-sm",
        }),
        // The default variant's backdrop-blur makes this button a containing
        // block, which would trap the after:inset-0 overlay callers use to
        // extend the tap target to the whole cell/row.
        "backdrop-blur-none",
        className,
      )}
      onClick={() => {
        if (disabled) {
          return;
        }
        onChange?.(toggleVote(value, yesDisabled));
      }}
      ref={ref}
    >
      <VoteIcon type={value} />
    </button>
  );
});
