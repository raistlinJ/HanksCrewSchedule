import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@rallly/ui/breadcrumb";
import { BarChart2Icon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandStyle } from "@/features/branding/components/brand-style";
import { CreatePoll } from "@/features/poll/components/create-poll";
import { loadOnDemandPollTitles } from "@/features/poll/loaders";
import { getActiveSpaceForUser } from "@/features/space/data";
import { Trans } from "@/i18n/client";
import { getTranslation } from "@/i18n/server";
import { getSession } from "@/lib/auth";

export default async function Page(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const isOnDemand = searchParams?.type === "on-demand";
  const session = await getSession();
  const userId =
    session?.user.id && !session.user.isGuest ? session.user.id : null;

  const space = userId ? await getActiveSpaceForUser(userId) : null;

  if (userId && !space) {
    redirect("/setup");
  }

  const primaryColor =
    space?.showBranding && space.primaryColor ? space.primaryColor : null;
  const existingOnDemandTitles = isOnDemand
    ? await loadOnDemandPollTitles({
        spaceId: space?.id,
        userId: session?.user.id,
      })
    : [];

  return (
    <div className="page-bg-gray-100 absolute inset-0 h-dvh scroll-pt-16 overflow-auto dark:bg-gray-900">
      {primaryColor ? <BrandStyle primaryColor={primaryColor} /> : null}
      <CreatePoll
        mode={isOnDemand ? "on-demand" : "standard"}
        existingOnDemandTitles={existingOnDemandTitles}
        nav={
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  render={
                    <Link href={isOnDemand ? "/on-demand-polls" : "/polls"} />
                  }
                  className="flex items-center gap-x-2"
                >
                  <BarChart2Icon className="size-4" />
                  {isOnDemand ? (
                    <Trans i18nKey="onDemandPolls" defaults="On-demand polls" />
                  ) : (
                    <Trans i18nKey="polls" defaults="Polls" />
                  )}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {isOnDemand ? (
                    <Trans
                      i18nKey="newOnDemandPoll"
                      defaults="New on-demand poll"
                    />
                  ) : (
                    <Trans i18nKey="newPoll" defaults="New poll" />
                  )}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />
    </div>
  );
}

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const [params, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const { t } = await getTranslation(params.locale);
  return {
    title:
      searchParams?.type === "on-demand"
        ? t("newOnDemandPoll", { defaultValue: "New on-demand poll" })
        : t("newPoll"),
  };
}
