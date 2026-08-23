import type { Metadata } from "next";
import {
  loadOnDemandPollStatusCounts,
  loadPollStatusCounts,
} from "@/features/poll/loaders";
import { getActiveSpace } from "@/features/space/loaders";
import { defineAbilityForMember } from "@/features/space/member/ability";
import { loadUserHasNoAccounts, requireUser } from "@/features/user/loaders";
import { getTranslation } from "@/i18n/server";
import { DashboardHome } from "./dashboard-home";

export default async function Page() {
  const [
    user,
    space,
    pollStatusCounts,
    onDemandPollStatusCounts,
    hasNoAccounts,
  ] = await Promise.all([
    requireUser(),
    getActiveSpace(),
    loadPollStatusCounts(),
    loadOnDemandPollStatusCounts(),
    loadUserHasNoAccounts(),
  ]);

  const ability = defineAbilityForMember({ user: { id: user.id }, space });

  return (
    <DashboardHome
      openPollCount={pollStatusCounts.open}
      activePollCount={pollStatusCounts.open + onDemandPollStatusCounts.open}
      upcomingPollCount={
        pollStatusCounts.scheduled + onDemandPollStatusCounts.scheduled
      }
      memberCount={space.memberCount}
      seatCount={space.seatCount}
      hasNoAccounts={hasNoAccounts}
      canManageBilling={ability.can("manage", "Billing")}
    />
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation();
  return {
    title: t("home", {
      defaultValue: "Home",
    }),
  };
}
