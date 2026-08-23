import type { Metadata } from "next";
import {
  PageContainer,
  PageContent,
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageTitle,
} from "@/components/page-layout";
import { SearchInput } from "@/components/search-input";
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
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const normalizedQuery = query.toLowerCase();
  const filteredItems = normalizedQuery
    ? items.filter(
        (item) =>
          item.title.toLowerCase().includes(normalizedQuery) ||
          item.description?.toLowerCase().includes(normalizedQuery) ||
          item.location?.toLowerCase().includes(normalizedQuery) ||
          item.polls.some((poll) =>
            poll.title.toLowerCase().includes(normalizedQuery),
          ),
      )
    : items;

  return (
    <PageContainer>
      <PageHeader className="flex-col md:flex-row">
        <PageHeaderContent>
          <PageTitle>Upcoming &amp; active polls</PageTitle>
        </PageHeaderContent>
        <SearchInput
          className="w-full md:w-72 md:shrink-0"
          placeholder="Filter polls and groups..."
        />
        <PageHeaderActions className="w-full md:w-auto">
          <ActivePollRange
            start={range.start.toISOString()}
            end={range.end.toISOString()}
            isCustom={hasValidCustomRange}
          />
        </PageHeaderActions>
      </PageHeader>
      <PageContent>
        <ActivePollsList items={filteredItems} search={query} />
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
