import type { Metadata } from "next";
import Link from "next/link";
import { PollGroupResultCards } from "@/features/poll/components/poll-group-result-cards";
import { loadPublicPollGroupResults } from "@/features/poll/loaders";
import { getLocale } from "@/i18n/server/get-locale";
import { DeviceDateTimeProvider } from "@/lib/datetime/device";
import { getDeviceDateTimeConfig } from "@/lib/datetime/server";

export default async function Page(props: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await props.params;
  const [group, locale, deviceDateTimeConfig] = await Promise.all([
    loadPublicPollGroupResults(groupId),
    getLocale(),
    getDeviceDateTimeConfig(),
  ]);

  return (
    <DeviceDateTimeProvider
      locale={locale}
      timeZone={deviceDateTimeConfig.timeZone}
      timeFormat={deviceDateTimeConfig.timeFormat}
    >
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <Link
          href={`/g/${group.id}`}
          className="font-medium text-primary text-sm hover:underline"
        >
          ← Back to poll group
        </Link>
        <div className="border-b pb-6">
          <h1 className="font-bold text-3xl tracking-tight">
            {group.title} – Results
          </h1>
          {group.description ? (
            <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
              {group.description}
            </p>
          ) : null}
        </div>
        <PollGroupResultCards group={group} />
      </main>
    </DeviceDateTimeProvider>
  );
}

export async function generateMetadata(props: {
  params: Promise<{ groupId: string }>;
}): Promise<Metadata> {
  const group = await loadPublicPollGroupResults((await props.params).groupId);
  return { title: `Results – ${group.title}` };
}
