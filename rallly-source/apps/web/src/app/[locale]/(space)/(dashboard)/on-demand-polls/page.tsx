import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { loadOnDemandPollStatusCounts } from "@/features/poll/loaders";
import { getTranslation } from "@/i18n/server";
import { createPrivateSSRHelper } from "@/trpc/server/create-ssr-helper";
import { PollsPage } from "../polls/polls-page";
import { searchParamsSchema } from "../polls/schema";

export default async function Page(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const { status, q, member } = searchParamsSchema.parse(searchParams);

  const helpers = await createPrivateSSRHelper();

  const [counts] = await Promise.all([
    loadOnDemandPollStatusCounts(),
    helpers.spaces.listMembers.prefetch(),
    helpers.polls.infiniteChronological.prefetchInfinite({
      status,
      search: q,
      member,
      category: "onDemand",
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(helpers.queryClient)}>
      <PollsPage counts={counts} isOnDemand />
    </HydrationBoundary>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation();
  return {
    title: t("onDemandPolls", {
      defaultValue: "On-demand polls",
    }),
  };
}
