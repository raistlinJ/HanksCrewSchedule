import { SidebarMenuButton, SidebarMenuItem } from "@rallly/ui/sidebar";
import { GaugeIcon } from "lucide-react";
import Link from "next/link";
import { isInitialAdmin } from "@/features/instance-settings/utils";
import { getCurrentUser } from "@/features/user/loaders";
import { Trans } from "@/i18n/client";

export async function ControlPanelMenuItem() {
  const user = await getCurrentUser();

  if (!user || (user.role !== "admin" && !isInitialAdmin(user.email))) {
    return null;
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton render={<Link href="/control-panel" />}>
        <GaugeIcon />
        <Trans i18nKey="controlPanel" defaults="Control Panel" />
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
