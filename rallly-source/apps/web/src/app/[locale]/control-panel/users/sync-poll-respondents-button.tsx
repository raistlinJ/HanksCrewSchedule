"use client";

import { Button } from "@rallly/ui/button";
import { toast } from "@rallly/ui/sonner";
import { RefreshCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Trans, useTranslation } from "@/i18n/client";
import { useSafeAction } from "@/lib/safe-action/client";
import { syncPollRespondentsAction } from "./actions";

export function SyncPollRespondentsButton() {
  const { t } = useTranslation();
  const router = useRouter();
  const syncRespondents = useSafeAction(syncPollRespondentsAction, {
    onSuccess: ({ data }) => {
      if (!data) {
        return;
      }

      if (data.createdUsers === 0 && data.linkedResponses === 0) {
        toast.success(
          t("pollRespondentsAlreadySynced", {
            defaultValue: "All poll respondents are already synced.",
          }),
        );
      } else {
        toast.success(
          t("pollRespondentsSynced", {
            defaultValue:
              "Created {createdUsers} users and linked {linkedResponses} poll responses.",
            createdUsers: data.createdUsers,
            linkedResponses: data.linkedResponses,
          }),
        );
      }

      if (data.skippedEmails > 0) {
        toast.info(
          t("pollRespondentsSyncSkipped", {
            defaultValue:
              "Skipped {count} invalid or unavailable email addresses.",
            count: data.skippedEmails,
          }),
        );
      }

      router.refresh();
    },
  });

  return (
    <Button
      loading={syncRespondents.isExecuting}
      onClick={() => syncRespondents.execute({})}
    >
      <RefreshCwIcon />
      <Trans i18nKey="syncPollRespondents" defaults="Sync poll respondents" />
    </Button>
  );
}
