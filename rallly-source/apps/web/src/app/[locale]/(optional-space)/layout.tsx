import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@rallly/ui/sidebar";
import { SettingsIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ControlPanelMenuItem } from "@/app/[locale]/(space)/(dashboard)/components/control-panel-menu-item";
import { FeedbackMenuItem } from "@/app/[locale]/(space)/(dashboard)/components/feedback-menu-item";
import { SpaceSidebarMenu } from "@/app/[locale]/(space)/(dashboard)/components/space-sidebar-menu";
import { SpaceSidebarProvider } from "@/app/[locale]/(space)/(dashboard)/components/space-sidebar-provider";
import { UpgradeMenuItem } from "@/app/[locale]/(space)/(dashboard)/components/upgrade-menu-item";
import { RouterLoadingIndicator } from "@/components/router-loading-indicator";
import { SessionRefresher } from "@/components/session-refresher";
import { TierProvider } from "@/features/billing/client";
import { PayWall } from "@/features/billing/components/pay-wall";
import { CommandMenu } from "@/features/navigation/components/command-menu";
import { isQuickCreateEnabled } from "@/features/quick-create/constants";
import { SpaceProvider } from "@/features/space/client";
import { SpaceDropdown } from "@/features/space/components/space-dropdown";
import {
  getActiveSpaceForUser,
  listSpacesForUser,
} from "@/features/space/data";
import { UserProvider } from "@/features/user/client";
import { NavUser } from "@/features/user/components/nav-user";
import { requireUser } from "@/features/user/loaders";
import { Trans } from "@/i18n/client";
import { getLocale } from "@/i18n/server/get-locale";
import { getSession } from "@/lib/auth";
import { isSelfHosted } from "@/lib/constants";
import { DeviceDateTimeProvider } from "@/lib/datetime/device";
import { getDeviceDateTimeConfig } from "@/lib/datetime/server";
import { IfFeatureEnabled } from "@/lib/feature-flags/client";

function OptionalSpaceSidebarShell({
  children,
  spaces,
}: {
  children: React.ReactNode;
  spaces: Awaited<ReturnType<typeof listSpacesForUser>>;
}) {
  return (
    <SpaceSidebarProvider>
      <CommandMenu />
      <div className="md:hidden">
        <Sidebar>
          <SidebarHeader>
            <SpaceDropdown
              spaces={spaces.map((space) => ({
                id: space.id,
                name: space.name,
                image: space.image,
                tier: space.tier,
              }))}
            />
          </SidebarHeader>
          <SidebarContent>
            <SpaceSidebarMenu />
          </SidebarContent>
          <SidebarFooter>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <UpgradeMenuItem />
                  <IfFeatureEnabled feature="feedback">
                    <FeedbackMenuItem />
                  </IfFeatureEnabled>
                  <ControlPanelMenuItem />
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      render={<Link href="/settings/profile" />}
                    >
                      <SettingsIcon />
                      <Trans i18nKey="settings" defaults="Settings" />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarSeparator className="my-1" />
            <NavUser />
          </SidebarFooter>
        </Sidebar>
      </div>
      <SidebarInset className="min-w-0">
        <div className="flex min-h-svh flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SpaceSidebarProvider>
  );
}

// The session awaits sit below the Suspense boundary in the default export
// so the document shell can flush before they resolve.
async function OptionalSpaceGate({ children }: { children: React.ReactNode }) {
  // Guests may only enter when quick create is enabled.
  if (!isQuickCreateEnabled) {
    await requireUser();
  }

  const [locale, deviceDateTimeConfig, session] = await Promise.all([
    getLocale(),
    getDeviceDateTimeConfig(),
    getSession(),
  ]);

  const user = session?.user;

  const space =
    user && !user.isGuest ? await getActiveSpaceForUser(user.id) : null;
  const spaces =
    user && !user.isGuest && space ? await listSpacesForUser(user.id) : null;
  const tier = space?.tier ?? (isSelfHosted ? "pro" : "hobby");

  const content =
    space && spaces ? (
      <SpaceProvider space={space}>
        <OptionalSpaceSidebarShell spaces={spaces}>
          {children}
        </OptionalSpaceSidebarShell>
      </SpaceProvider>
    ) : (
      children
    );

  return (
    <>
      <SessionRefresher />
      <UserProvider user={user ?? null}>
        <DeviceDateTimeProvider
          locale={locale}
          timeZone={
            user?.timeZone ?? deviceDateTimeConfig.timeZone ?? undefined
          }
          timeFormat={
            user?.timeFormat ?? deviceDateTimeConfig.timeFormat ?? undefined
          }
          weekStart={user?.weekStart ?? undefined}
        >
          <TierProvider tier={tier}>
            {content}
            <PayWall />
          </TierProvider>
        </DeviceDateTimeProvider>
      </UserProvider>
    </>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<RouterLoadingIndicator />}>
      <OptionalSpaceGate>{children}</OptionalSpaceGate>
    </Suspense>
  );
}
