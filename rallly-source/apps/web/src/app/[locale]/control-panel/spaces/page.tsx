import { Badge } from "@rallly/ui/badge";
import { LayersIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import * as z from "zod";
import {
  EmptyState,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import {
  SettingsPage,
  SettingsPageContent,
  SettingsPageDescription,
  SettingsPageHeader,
  SettingsPageTitle,
} from "@/components/settings-layout";
import { StackedList, StackedListItem } from "@/components/stacked-list";
import { SpaceIcon } from "@/features/space/components/space-icon";
import { loadAllSpacesForAdmin } from "@/features/space/loaders";
import { Trans } from "@/i18n/client";
import { getTranslation } from "@/i18n/server";
import { SpaceSearchInput } from "./space-search-input";

const searchParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional(),
});

export default async function AllSpacesPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { page, pageSize, q } = searchParamsSchema.parse(
    await props.searchParams,
  );
  const { spaces, total } = await loadAllSpacesForAdmin({ page, pageSize, q });

  return (
    <SettingsPage>
      <SettingsPageHeader>
        <SettingsPageTitle>
          <Trans i18nKey="allSpaces" defaults="All spaces" />
        </SettingsPageTitle>
        <SettingsPageDescription>
          <Trans
            i18nKey="allSpacesDescription"
            defaults="View every space on this instance, including spaces owned by registered users."
          />
        </SettingsPageDescription>
      </SettingsPageHeader>
      <SettingsPageContent>
        <div className="space-y-4">
          <SpaceSearchInput />
          {spaces.length > 0 ? (
            <>
              <StackedList className="text-sm">
                {spaces.map((space) => (
                  <StackedListItem key={space.id}>
                    <SpaceIcon
                      src={space.image ?? undefined}
                      name={space.name}
                      size="lg"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-semibold">{space.name}</div>
                        <Badge className="capitalize">{space.tier}</Badge>
                        <Badge>
                          {space.owner.isAnonymous ? (
                            <Trans
                              i18nKey="guestOwner"
                              defaults="Guest owner"
                            />
                          ) : (
                            <Trans
                              i18nKey="registeredOwner"
                              defaults="Registered owner"
                            />
                          )}
                        </Badge>
                      </div>
                      <div className="mt-1 truncate text-muted-foreground">
                        <Trans i18nKey="owner" defaults="Owner" />:{" "}
                        {space.owner.isAnonymous ? (
                          <span>
                            {space.owner.name} ({space.owner.email})
                          </span>
                        ) : (
                          <Link
                            className="hover:text-foreground hover:underline"
                            href={`/control-panel/users?q=${encodeURIComponent(space.owner.email)}`}
                          >
                            {space.owner.name} ({space.owner.email})
                          </Link>
                        )}
                      </div>
                      <div className="mt-1 text-muted-foreground text-xs">
                        <Trans
                          i18nKey="spaceContentCounts"
                          defaults="{members, plural, one {# member} other {# members}} · {polls, plural, one {# poll} other {# polls}} · {groups, plural, one {# group} other {# groups}} · {events, plural, one {# event} other {# events}}"
                          values={{
                            members: space._count.members,
                            polls: space._count.polls,
                            groups: space._count.pollGroups,
                            events: space._count.scheduledEvents,
                          }}
                        />
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-muted-foreground text-xs">
                      <Trans
                        i18nKey="createdOn"
                        defaults="Created {date, date, medium}"
                        values={{ date: space.createdAt }}
                      />
                    </div>
                  </StackedListItem>
                ))}
              </StackedList>
              <Pagination
                currentPage={page}
                totalItems={total}
                pageSize={pageSize}
              />
            </>
          ) : (
            <EmptyState>
              <EmptyStateIcon>
                <LayersIcon />
              </EmptyStateIcon>
              <EmptyStateTitle>
                <Trans i18nKey="noSpaces" defaults="No spaces found" />
              </EmptyStateTitle>
              <EmptyStateDescription>
                <Trans
                  i18nKey="noAdminSpacesDescription"
                  defaults="No spaces match the current search."
                />
              </EmptyStateDescription>
            </EmptyState>
          )}
        </div>
      </SettingsPageContent>
    </SettingsPage>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { t } = await getTranslation(locale);
  return {
    title: t("allSpaces", { defaultValue: "All spaces" }),
  };
}
