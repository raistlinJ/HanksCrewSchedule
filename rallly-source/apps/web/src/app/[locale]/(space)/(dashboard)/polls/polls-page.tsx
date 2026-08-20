"use client";

import { buttonVariants } from "@rallly/ui";
import { CircleStopIcon, InboxIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  EmptyState,
  EmptyStateDescription,
  EmptyStateFooter,
  EmptyStateIcon,
  EmptyStateTitle,
} from "@/components/empty-state";
import { MemberSelector } from "@/components/member-selector";
import {
  PageContainer,
  PageContent,
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageTitle,
} from "@/components/page-layout";
import { SearchInput } from "@/components/search-input";
import { PollsInfiniteList } from "@/features/poll/components/polls-infinite-list";
import type { PollStatus } from "@/features/poll/schema";
import { Trans, useTranslation } from "@/i18n/client";
import { trpc } from "@/trpc/client";
import { PollsTabbedView } from "./polls-tabbed-view";
import { searchParamsSchema } from "./schema";

function NoOpenPollsEmptyState({
  closedCount,
  createHref,
  isOnDemand,
}: {
  closedCount: number;
  createHref: string;
  isOnDemand: boolean;
}) {
  return (
    <EmptyState className="h-96">
      <EmptyStateIcon>
        <CircleStopIcon />
      </EmptyStateIcon>
      <EmptyStateTitle>
        <Trans i18nKey="noOpenPolls" defaults="No open polls" />
      </EmptyStateTitle>
      <EmptyStateDescription>
        <Trans
          i18nKey="noOpenPollsDescription"
          defaults="Polls close automatically once all of their dates have passed. You have {count, plural, one {1 closed poll} other {# closed polls}}."
          values={{ count: closedCount }}
        />
      </EmptyStateDescription>
      <EmptyStateFooter className="flex flex-wrap justify-center gap-2">
        <Link
          href="?status=closed"
          className={buttonVariants({ variant: "primary" })}
        >
          <Trans i18nKey="viewClosedPolls" defaults="View closed polls" />
        </Link>
        <Link href={createHref} className={buttonVariants()}>
          {isOnDemand ? (
            <Trans
              i18nKey="createOnDemandPoll"
              defaults="Create on-demand poll"
            />
          ) : (
            <Trans i18nKey="createPoll" defaults="Create poll" />
          )}
        </Link>
      </EmptyStateFooter>
    </EmptyState>
  );
}

function PollsEmptyState({
  createHref,
  isOnDemand,
}: {
  createHref: string;
  isOnDemand: boolean;
}) {
  return (
    <EmptyState className="h-96">
      <EmptyStateIcon>
        <InboxIcon />
      </EmptyStateIcon>
      <EmptyStateTitle>
        {isOnDemand ? (
          <Trans i18nKey="noOnDemandPolls" defaults="No on-demand polls" />
        ) : (
          <Trans i18nKey="noPolls" defaults="No polls" />
        )}
      </EmptyStateTitle>
      <EmptyStateDescription>
        {isOnDemand ? (
          <Trans
            i18nKey="noOnDemandPollsDescription"
            defaults="Create an on-demand poll when you need a shareable poll right away."
          />
        ) : (
          <Trans
            i18nKey="noPollsDescription"
            defaults="Get started by creating a new poll."
          />
        )}
      </EmptyStateDescription>
      <EmptyStateFooter>
        <Link href={createHref} className={buttonVariants()}>
          {isOnDemand ? (
            <Trans
              i18nKey="createOnDemandPoll"
              defaults="Create on-demand poll"
            />
          ) : (
            <Trans i18nKey="createPoll" defaults="Create poll" />
          )}
        </Link>
      </EmptyStateFooter>
    </EmptyState>
  );
}

export function PollsPage({
  counts,
  isOnDemand = false,
}: {
  counts: Record<PollStatus, number>;
  isOnDemand?: boolean;
}) {
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [{ data: members }] = trpc.spaces.listMembers.useSuspenseQuery();

  const { status, q, member } = searchParamsSchema.parse(
    Object.fromEntries(searchParams.entries()),
  );

  const hasFilters = Boolean(q || member);
  const showClosedPollsPointer =
    status === "open" && !hasFilters && counts.closed > 0;
  const createHref = isOnDemand ? "/new?type=on-demand" : "/new";

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>
            {isOnDemand ? (
              <Trans i18nKey="onDemandPolls" defaults="On-demand polls" />
            ) : (
              <Trans i18nKey="polls" defaults="Polls" />
            )}
          </PageTitle>
        </PageHeaderContent>
        <PageHeaderActions>
          {!isOnDemand ? (
            <Link href="/new?type=on-demand" className={buttonVariants()}>
              <PlusIcon data-icon="inline-start" />
              <Trans
                i18nKey="createOnDemandPoll"
                defaults="Create on-demand poll"
              />
            </Link>
          ) : null}
          <Link
            href={createHref}
            className={buttonVariants({ variant: "primary" })}
          >
            <PlusIcon data-icon="inline-start" />
            {isOnDemand ? (
              <Trans i18nKey="newOnDemandPoll" defaults="New on-demand poll" />
            ) : (
              <Trans i18nKey="newPoll" defaults="New poll" />
            )}
          </Link>
        </PageHeaderActions>
      </PageHeader>
      <PageContent>
        <PollsTabbedView counts={counts}>
          <div className="mb-6 flex gap-x-2">
            <SearchInput
              placeholder={t("searchPollsPlaceholder", {
                defaultValue: "Search polls by title...",
              })}
            />
            <MemberSelector members={members} />
          </div>
          <PollsInfiniteList
            status={status}
            search={q}
            member={member}
            category={isOnDemand ? "onDemand" : "regular"}
            emptyState={
              showClosedPollsPointer ? (
                <NoOpenPollsEmptyState
                  closedCount={counts.closed}
                  createHref={createHref}
                  isOnDemand={isOnDemand}
                />
              ) : (
                <PollsEmptyState
                  createHref={createHref}
                  isOnDemand={isOnDemand}
                />
              )
            }
          />
        </PollsTabbedView>
      </PageContent>
    </PageContainer>
  );
}
