"use client";

import type { LucideIcon } from "lucide-react";
import {
  BarChart2Icon,
  CalendarDaysIcon,
  FolderIcon,
  HomeIcon,
  ZapIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import React from "react";
import { useTranslation } from "@/i18n/client";
import { useFeatureFlag } from "@/lib/feature-flags/client";

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  children?: NavigationItem[];
  isActive?: boolean;
  external?: boolean;
}

export interface NavigationSection {
  id: string;
  title?: string;
  items: NavigationItem[];
}

export interface NavigationConfig {
  sections: NavigationSection[];
}

export const useSpaceMenu = () => {
  const { t } = useTranslation();
  const pathname = usePathname();
  const isCalendarsEnabled = useFeatureFlag("calendars");
  const config = React.useMemo<NavigationConfig>(
    () => ({
      sections: [
        {
          id: "home",
          items: [
            {
              id: "home",
              label: t("home", { defaultValue: "Home" }),
              href: "/",
              icon: HomeIcon,
              isActive: pathname === "/",
            },
          ],
        },
        {
          id: "content",
          title: t("content", { defaultValue: "Content" }),
          items: [
            {
              id: "on-demand-polls",
              label: t("onDemandPolls", {
                defaultValue: "On-demand polls",
              }),
              href: "/on-demand-polls",
              icon: ZapIcon,
              isActive: pathname.startsWith("/on-demand-polls"),
            },
            {
              id: "polls",
              label: t("polls", { defaultValue: "Polls" }),
              href: "/polls",
              icon: BarChart2Icon,
              isActive: pathname.startsWith("/polls"),
            },
            {
              id: "groups",
              label: "Poll Groups",
              href: "/groups",
              icon: FolderIcon,
              isActive: pathname.startsWith("/groups"),
            },

            ...(isCalendarsEnabled
              ? [
                  {
                    id: "calendar",
                    label: t("calendar", { defaultValue: "Calendar" }),
                    href: "/calendar",
                    icon: CalendarDaysIcon,
                    isActive: pathname === "/calendar",
                  },
                ]
              : []),
          ],
        },
      ],
    }),
    [pathname, t, isCalendarsEnabled],
  );

  return React.useMemo(
    () => ({
      config,
    }),
    [config],
  );
};
