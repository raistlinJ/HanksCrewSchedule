"use client";

import { Button } from "@rallly/ui/button";
import { shortUrl } from "@rallly/utils/absolute-url";
import { ArrowLeftIcon, CheckIcon, CopyIcon, DownloadIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useCopyToClipboard } from "react-use";
import { OptimizedAvatarImage } from "@/components/optimized-avatar-image";
import { usePoll } from "@/features/poll/client";
import { useParticipants } from "@/features/poll/components/participants-provider";
import { Trans } from "@/i18n/client";
import { useDateTime } from "@/lib/datetime/client";

export function PollResultsPage({
  publicView = false,
}: {
  publicView?: boolean;
}) {
  const { participants } = useParticipants();
  const poll = usePoll();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { formatDateTime } = useDateTime();
  const [, copyToClipboard] = useCopyToClipboard();
  const [didCopyResultsLink, setDidCopyResultsLink] = useState(false);
  const token = searchParams.get("token");
  const publicPollHref = token
    ? `/invite/${poll.id}?token=${encodeURIComponent(token)}`
    : `/invite/${poll.id}`;
  const publicResultsLink = shortUrl(`/invite/${poll.id}/results`);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        {publicView ? (
          <Link
            href={publicPollHref}
            className="flex items-center font-medium text-primary text-sm hover:underline"
          >
            <ArrowLeftIcon className="mr-1 h-4 w-4" />
            Back to poll
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center font-medium text-primary text-sm hover:underline"
          >
            <ArrowLeftIcon className="mr-1 h-4 w-4" />
            Back to poll
          </button>
        )}
      </div>

      <div className="mb-8 flex items-start justify-between border-b pb-8">
        <div>
          <h1 className="mb-2 font-bold text-3xl tracking-tight">
            {poll.title} - Results
          </h1>
          {poll.description && (
            <p className="whitespace-pre-wrap text-md text-muted-foreground">
              {poll.description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {!publicView && poll.publicResults ? (
            <Button
              onClick={() => {
                copyToClipboard(publicResultsLink);
                setDidCopyResultsLink(true);
                window.setTimeout(() => setDidCopyResultsLink(false), 1000);
              }}
            >
              {didCopyResultsLink ? <CheckIcon /> : <CopyIcon />}
              {didCopyResultsLink ? "Copied" : "Copy public results link"}
            </Button>
          ) : null}
          {poll.canManage ? (
            <a href={`/poll/${poll.id}/export/csv`} download>
              <Button className="flex items-center gap-2">
                <DownloadIcon className="h-4 w-4" />
                <Trans i18nKey="exportToCsv" defaults="Export to CSV" />
              </Button>
            </a>
          ) : null}
        </div>
      </div>

      <div className="space-y-12">
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">
                  <Trans i18nKey="name" defaults="Name" />
                </th>
                <th className="px-4 py-3 font-medium">
                  <Trans i18nKey="email" defaults="Email" />
                </th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Yes votes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {participants.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    <Trans
                      i18nKey="noParticipants"
                      defaults="No participants"
                    />
                  </td>
                </tr>
              ) : (
                participants.map((p) => {
                  const yesVotesCount = p.votes.filter(
                    (v) => v.type === "yes",
                  ).length;
                  return (
                    <tr key={p.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-x-2">
                          <OptimizedAvatarImage
                            size="sm"
                            name={p.name}
                            src={p.image ?? undefined}
                          />
                          <span className="font-medium">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.email ? (
                          p.email
                        ) : (
                          <span className="italic">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDateTime(p.createdAt, "date")}
                      </td>
                      <td className="px-4 py-3 font-medium">{yesVotesCount}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
