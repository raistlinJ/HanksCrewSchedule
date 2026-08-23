import type { Metadata } from "next";
import {
  PageContainer,
  PageContent,
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageTitle,
} from "@/components/page-layout";
import { loadActivePollOverview } from "@/features/poll/loaders";
import { getTranslation } from "@/i18n/server";
import { ActivePollRange } from "./active-poll-range";
import { ActivePollsList } from "./active-polls-list";

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function parseDateParam(value: string | string[] | undefined) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default async function ActivePollsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requestedStart = parseDateParam(params.start);
  const requestedEnd = parseDateParam(params.end);
  const hasValidCustomRange =
    requestedStart !== null &&
    requestedEnd !== null &&
    requestedStart < requestedEnd;
  const now = new Date();
  const range = hasValidCustomRange
    ? { start: requestedStart, end: requestedEnd }
    : {
        start: new Date(now.getTime() - FOUR_HOURS_MS),
        end: new Date(now.getTime() + ONE_WEEK_MS),
      };
  const items = await loadActivePollOverview(range);

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Upcoming &amp; active polls</PageTitle>
          <p className="text-muted-foreground text-sm">
            {hasValidCustomRange
              ? "Showing polls that overlap your custom range."
              : "Showing polls through one week ahead and for four hours after their last end time."}{" "}
            Polls in the same group share one card.
          </p>
        </PageHeaderContent>
        <PageHeaderActions>
          <ActivePollRange
            start={range.start.toISOString()}
            end={range.end.toISOString()}
            isCustom={hasValidCustomRange}
          />
        </PageHeaderActions>
      </PageHeader>
      <PageContent>
        <ActivePollsList items={items} />
      </PageContent>
    </PageContainer>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation();
  return {
    title: t("activePolls", { defaultValue: "Upcoming & active polls" }),
  };
}
