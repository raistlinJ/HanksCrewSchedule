import { Alert, AlertDescription, AlertTitle } from "@rallly/ui/alert";
import { ShieldAlertIcon } from "lucide-react";
import type { Metadata } from "next";
import {
  PageSection,
  PageSectionContent,
  PageSectionDescription,
  PageSectionGroup,
  PageSectionHeader,
  PageSectionTitle,
} from "@/components/page-layout";
import {
  SettingsPage,
  SettingsPageContent,
  SettingsPageDescription,
  SettingsPageHeader,
  SettingsPageTitle,
} from "@/components/settings-layout";
import { Trans } from "@/i18n/client";
import { DownloadArchiveButton, RestoreArchiveButton } from "./archive-actions";

export default function ArchivePage() {
  return (
    <SettingsPage>
      <SettingsPageHeader>
        <SettingsPageTitle>
          <Trans i18nKey="instanceArchive" defaults="Instance archive" />
        </SettingsPageTitle>
        <SettingsPageDescription>
          Export or restore the portable data stored by this instance.
        </SettingsPageDescription>
      </SettingsPageHeader>
      <SettingsPageContent>
        <PageSectionGroup>
          <Alert variant="warning">
            <ShieldAlertIcon />
            <AlertTitle>Keep archive files private</AlertTitle>
            <AlertDescription>
              Archives contain personal data, password hashes, poll responses,
              comments, invitations, and private access links. Store and send
              them as securely as a database backup.
            </AlertDescription>
          </Alert>

          <PageSection variant="card">
            <PageSectionHeader>
              <PageSectionTitle>Download</PageSectionTitle>
              <PageSectionDescription>
                Creates a JSON archive of users, spaces and memberships, polls
                and poll groups, responses, comments, invitations, scheduled
                events, event types, and sheets. Sessions and external secrets
                are excluded.
              </PageSectionDescription>
            </PageSectionHeader>
            <PageSectionContent>
              <DownloadArchiveButton />
            </PageSectionContent>
          </PageSection>

          <PageSection variant="card">
            <PageSectionHeader>
              <PageSectionTitle>Restore</PageSectionTitle>
              <PageSectionDescription>
                Import an archive from this feature. Restore replaces existing
                portable data atomically and signs everyone out. Destination
                instance settings and licensing remain unchanged.
              </PageSectionDescription>
            </PageSectionHeader>
            <PageSectionContent>
              <RestoreArchiveButton />
            </PageSectionContent>
          </PageSection>
        </PageSectionGroup>
      </SettingsPageContent>
    </SettingsPage>
  );
}

export const metadata: Metadata = {
  title: "Instance archive",
};
