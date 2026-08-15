import { Button } from "@rallly/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  SettingsPage,
  SettingsPageAction,
  SettingsPageContent,
  SettingsPageDescription,
  SettingsPageHeader,
  SettingsPageTitle,
} from "@/components/settings-layout";
import { loadUserPollResponses } from "@/features/user/loaders";
import { Trans } from "@/i18n/client";
import { UserResponsesEditor } from "./user-responses-editor";

export default async function UserResponsesPage({
  params,
}: {
  params: Promise<{ locale: string; userId: string }>;
}) {
  const { userId } = await params;
  const data = await loadUserPollResponses(userId);

  if (!data) {
    notFound();
  }

  return (
    <SettingsPage>
      <SettingsPageHeader>
        <SettingsPageTitle>
          <Trans
            i18nKey="userResponses"
            defaults="Responses for {name}"
            values={{ name: data.user.name }}
          />
        </SettingsPageTitle>
        <SettingsPageDescription>{data.user.email}</SettingsPageDescription>
        <SettingsPageAction>
          <Button variant="ghost" render={<Link href="/control-panel/users" />}>
            <ArrowLeftIcon />
            <Trans i18nKey="users" defaults="Users" />
          </Button>
        </SettingsPageAction>
      </SettingsPageHeader>
      <SettingsPageContent>
        <UserResponsesEditor userId={userId} responses={data.responses} />
      </SettingsPageContent>
    </SettingsPage>
  );
}

export const metadata: Metadata = {
  title: "User responses",
};
