import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { SessionRefresher } from "@/components/session-refresher";
import { PermissionProvider } from "@/features/poll/client";
import { PollBrandingFromContext } from "@/features/poll/components/poll-branding";
import { loadPublicPollMetadata } from "@/features/poll/loaders";
import { UserProvider } from "@/features/user/client";
import { getLocale } from "@/i18n/server/get-locale";
import { getSession } from "@/lib/auth";
import { DeviceDateTimeProvider } from "@/lib/datetime/device";
import { getDeviceDateTimeConfig } from "@/lib/datetime/server";
import { decryptToken } from "@/lib/session";
import { createPublicSSRHelper } from "@/trpc/server/create-ssr-helper";
import Providers from "../providers";
import { AuxiliarySelectionsPage } from "./auxiliary-selections-page";

export default async function Page(props: {
  params: Promise<{ urlId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { urlId } = await props.params;
  const { token } = await props.searchParams;

  await loadPublicPollMetadata(urlId);

  const trpc = await createPublicSSRHelper();
  const [locale, session, deviceDateTimeConfig] = await Promise.all([
    getLocale(),
    getSession(),
    getDeviceDateTimeConfig(),
    trpc.polls.get.prefetch({ urlId }),
    trpc.polls.participants.list.prefetch({ pollId: urlId, token }),
  ]);

  let impersonatedUserId: string | null = null;
  if (token) {
    const value = await decryptToken<{ userId: string }>(token);
    if (value) {
      impersonatedUserId = value.userId;
    }
  }

  return (
    <HydrationBoundary state={dehydrate(trpc.queryClient)}>
      <SessionRefresher />
      <UserProvider user={session?.user ?? null}>
        <DeviceDateTimeProvider
          locale={locale}
          timeZone={deviceDateTimeConfig.timeZone}
          timeFormat={deviceDateTimeConfig.timeFormat}
        >
          <PermissionProvider impersonatedUserId={impersonatedUserId}>
            <Providers>
              <PollBrandingFromContext />
              <AuxiliarySelectionsPage />
            </Providers>
          </PermissionProvider>
        </DeviceDateTimeProvider>
      </UserProvider>
    </HydrationBoundary>
  );
}

export async function generateMetadata(props: {
  params: Promise<{ urlId: string }>;
}): Promise<Metadata> {
  const poll = await loadPublicPollMetadata((await props.params).urlId);

  return {
    title: `Selections – ${poll.title}`,
  };
}
