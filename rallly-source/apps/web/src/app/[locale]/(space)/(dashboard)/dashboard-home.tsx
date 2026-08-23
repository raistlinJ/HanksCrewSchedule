import { Tile, TileDescription, TileGrid, TileTitle } from "@rallly/ui/tile";
import { CalendarClockIcon, FolderIcon, ZapIcon } from "lucide-react";
import { Trans } from "react-i18next/TransWithoutContext";
import { HoverPrefetchLink } from "@/components/hover-prefetch-link";
import {
  BillingPageIcon,
  MembersPageIcon,
  PollPageIcon,
  SettingsPageIcon,
} from "@/components/page-icons";
import {
  PageContainer,
  PageContent,
  PageHeader,
  PageTitle,
} from "@/components/page-layout";
import { getTranslation } from "@/i18n/server";
import { isFeatureEnabled } from "@/lib/feature-flags/server";
import { PasswordSetupAlert } from "./password-setup-alert";

export async function DashboardHome({
  openPollCount,
  activePollCount,
  upcomingPollCount,
  memberCount,
  seatCount,
  hasNoAccounts,
  canManageBilling,
}: {
  openPollCount: number;
  activePollCount: number;
  upcomingPollCount: number;
  memberCount: number;
  seatCount: number;
  hasNoAccounts: boolean;
  canManageBilling: boolean;
}) {
  const { t, i18n } = await getTranslation();

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>
          <Trans t={t} i18n={i18n} ns="app" i18nKey="home" defaults="Home" />
        </PageTitle>
      </PageHeader>
      <PageContent className="space-y-8">
        {hasNoAccounts && isFeatureEnabled("emailLogin") ? (
          <PasswordSetupAlert />
        ) : null}
        <TileGrid>
          <Tile render={<HoverPrefetchLink href="/active-polls" />}>
            <CalendarClockIcon className="size-8 text-primary" />
            <TileTitle>View upcoming/active polls</TileTitle>
            <TileDescription>
              {activePollCount} active · {upcomingPollCount} upcoming
            </TileDescription>
          </Tile>
        </TileGrid>
        <div className="space-y-4">
          <h2 className="text-muted-foreground text-sm">
            <Trans
              t={t}
              i18n={i18n}
              ns="app"
              i18nKey="homeActionsTitle"
              defaults="Actions"
            />
          </h2>
          <TileGrid>
            <Tile render={<HoverPrefetchLink href="/new?type=on-demand" />}>
              <ZapIcon className="size-8 text-primary" />
              <TileTitle>
                <Trans
                  t={t}
                  i18n={i18n}
                  ns="app"
                  i18nKey="createOnDemandPoll"
                  defaults="Create on-demand poll"
                />
              </TileTitle>
            </Tile>
            <Tile render={<HoverPrefetchLink href="/new" />}>
              <PollPageIcon />
              <TileTitle>
                <Trans
                  t={t}
                  i18n={i18n}
                  ns="app"
                  i18nKey="createPoll"
                  defaults="Create Poll"
                />
              </TileTitle>
            </Tile>
            <Tile render={<HoverPrefetchLink href="/groups" />}>
              <FolderIcon className="h-8 w-8 text-primary" />
              <TileTitle>Create Poll Group</TileTitle>
            </Tile>
          </TileGrid>
        </div>
        <div className="space-y-4">
          <h2 className="text-muted-foreground text-sm">
            <Trans
              t={t}
              i18n={i18n}
              ns="app"
              i18nKey="content"
              defaults="Content"
            />
          </h2>
          <TileGrid>
            <Tile render={<HoverPrefetchLink href="/polls" />}>
              <PollPageIcon />
              <TileTitle>
                <Trans
                  t={t}
                  i18n={i18n}
                  ns="app"
                  i18nKey="polls"
                  defaults="Polls"
                />
              </TileTitle>
              <TileDescription>
                <Trans
                  t={t}
                  i18n={i18n}
                  ns="app"
                  i18nKey="openPollCount"
                  defaults="{count, plural, other {# open}}"
                  values={{ count: openPollCount }}
                />
              </TileDescription>
            </Tile>

            <Tile render={<HoverPrefetchLink href="/on-demand-polls" />}>
              <ZapIcon className="size-8 text-primary" />
              <TileTitle>
                <Trans
                  t={t}
                  i18n={i18n}
                  ns="app"
                  i18nKey="onDemandPolls"
                  defaults="On-demand polls"
                />
              </TileTitle>
              <TileDescription>
                <Trans
                  t={t}
                  i18n={i18n}
                  ns="app"
                  i18nKey="onDemandPollsDescription"
                  defaults="Polls created for immediate sharing."
                />
              </TileDescription>
            </Tile>

            <Tile render={<HoverPrefetchLink href="/groups" />}>
              <FolderIcon className="h-8 w-8 text-primary" />
              <TileTitle>Poll Groups</TileTitle>
              <TileDescription>Manage your poll groups.</TileDescription>
            </Tile>
          </TileGrid>
        </div>
        <div className="space-y-4">
          <h2 className="text-muted-foreground text-sm">
            <Trans
              t={t}
              i18n={i18n}
              ns="app"
              i18nKey="manage"
              defaults="Manage"
            />
          </h2>
          <TileGrid>
            <Tile render={<HoverPrefetchLink href="/settings/general" />}>
              <SettingsPageIcon />
              <TileTitle>
                <Trans
                  t={t}
                  i18n={i18n}
                  ns="app"
                  i18nKey="settings"
                  defaults="Settings"
                />
              </TileTitle>
            </Tile>

            <Tile render={<HoverPrefetchLink href="/settings/members" />}>
              <MembersPageIcon />
              <TileTitle>
                <Trans
                  t={t}
                  i18n={i18n}
                  ns="app"
                  i18nKey="members"
                  defaults="Members"
                />
              </TileTitle>
              <TileDescription>
                <Trans
                  t={t}
                  i18n={i18n}
                  ns="app"
                  i18nKey="memberCount"
                  defaults="{count, plural, =0 {No members} one {1 member} other {# members}}"
                  values={{ count: memberCount }}
                />
              </TileDescription>
            </Tile>

            {isFeatureEnabled("billing") && canManageBilling ? (
              <Tile render={<HoverPrefetchLink href="/settings/billing" />}>
                <BillingPageIcon />
                <TileTitle>
                  <Trans
                    t={t}
                    i18n={i18n}
                    ns="app"
                    i18nKey="billing"
                    defaults="Billing"
                  />
                </TileTitle>
                <TileDescription>
                  <Trans
                    t={t}
                    i18n={i18n}
                    ns="app"
                    i18nKey="seatCount"
                    defaults="{count, plural, one {# seat} other {# seats}}"
                    values={{ count: seatCount }}
                  />
                </TileDescription>
              </Tile>
            ) : null}
          </TileGrid>
        </div>
      </PageContent>
    </PageContainer>
  );
}
