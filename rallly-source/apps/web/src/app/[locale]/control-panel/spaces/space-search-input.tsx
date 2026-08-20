"use client";

import { SearchInput } from "@/components/search-input";
import { useTranslation } from "@/i18n/client";

export function SpaceSearchInput() {
  const { t } = useTranslation();
  return (
    <SearchInput
      placeholder={t("searchSpaces", {
        defaultValue: "Search spaces or owners...",
      })}
    />
  );
}
