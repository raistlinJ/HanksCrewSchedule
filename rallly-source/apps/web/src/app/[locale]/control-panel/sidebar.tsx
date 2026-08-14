import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
} from "@rallly/ui/sidebar";
import {
  ArchiveIcon,
  ArrowLeftIcon,
  HomeIcon,
  PaletteIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react";
import type * as React from "react";

import { NavUser } from "@/features/user/components/nav-user";
import { Trans } from "@/i18n/client";

import { NavItem } from "./nav-item";

export async function ControlPanelSidebar(
  props: React.ComponentProps<typeof Sidebar>,
) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <NavItem href="/">
            <ArrowLeftIcon className="size-4" />
            <Trans i18nKey="back" defaults="Back" />
          </NavItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <Trans i18nKey="controlPanel" defaults="Control Panel" />
          </SidebarGroupLabel>
          <SidebarMenu>
            <NavItem href="/control-panel">
              <HomeIcon className="size-4" />
              <Trans i18nKey="home" defaults="Home" />
            </NavItem>
            <NavItem href="/control-panel/users">
              <UsersIcon className="size-4" />
              <Trans i18nKey="users" defaults="Users" />
            </NavItem>

            <NavItem href="/control-panel/branding">
              <PaletteIcon className="size-4" />
              <Trans i18nKey="branding" defaults="Branding" />
            </NavItem>
            <NavItem href="/control-panel/settings">
              <SettingsIcon className="size-4" />
              <Trans i18nKey="settings" defaults="Settings" />
            </NavItem>
            <NavItem href="/control-panel/archive">
              <ArchiveIcon className="size-4" />
              <Trans i18nKey="instanceArchive" defaults="Instance archive" />
            </NavItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
