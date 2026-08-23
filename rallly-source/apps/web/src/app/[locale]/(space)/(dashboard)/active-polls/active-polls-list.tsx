"use client";

import { Button } from "@rallly/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@rallly/ui/dialog";
import { shortUrl } from "@rallly/utils/absolute-url";
import {
  BarChart2Icon,
  CalendarClockIcon,
  FolderIcon,
  MapPinIcon,
  QrCodeIcon,
  ScanQrCodeIcon,
  SquareArrowOutUpRightIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import React from "react";
import { CopyLinkButton } from "@/components/copy-link-button";
import type { ActivePollOverviewItem } from "@/features/poll/active-polls/utils";
import { useDateTime } from "@/lib/datetime/client";

function ItemDetails({ item }: { item: ActivePollOverviewItem }) {
  const { formatDateTime } = useDateTime();
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm md:flex md:flex-wrap md:items-center md:gap-x-6 md:gap-y-2">
      <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
        <CalendarClockIcon className="size-4 shrink-0" />
        <span className="truncate">
          {item.nextStart
            ? formatDateTime(item.nextStart, "datetime", {
                showTimeZone: false,
              })
            : item.status === "scheduled"
              ? "Upcoming"
              : item.status === "closed"
                ? "Recently ended"
                : "Active now"}
        </span>
      </span>
      <span className="flex items-center gap-2 text-muted-foreground">
        <UsersIcon className="size-4 shrink-0" />
        {item.yesResponseCount} Yes Responses
      </span>
      {item.location ? (
        <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
          <MapPinIcon className="size-4 shrink-0" />
          <span className="truncate">{item.location}</span>
        </span>
      ) : null}
    </div>
  );
}

function PublicResultsLink({ item }: { item: ActivePollOverviewItem }) {
  if (!item.publicResultsHref) return null;

  const href = shortUrl(item.publicResultsHref);

  return (
    <div className="flex min-w-0 max-w-full items-center gap-1.5 text-sm">
      <SquareArrowOutUpRightIcon className="size-4 shrink-0 text-muted-foreground" />
      <span className="shrink-0 font-medium">Public Results:</span>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        title={href}
        className="min-w-0 truncate text-primary underline-offset-4 hover:underline"
      >
        {href}
      </a>
      <CopyLinkButton href={href} className="size-7 shrink-0" />
    </div>
  );
}

function ItemActions({
  item,
  compact,
  onShowQr,
}: {
  item: ActivePollOverviewItem;
  compact?: boolean;
  onShowQr: () => void;
}) {
  const size = compact ? "sm" : "default";
  return (
    <div
      className={
        compact
          ? "flex max-w-96 shrink-0 flex-wrap items-center justify-end gap-2"
          : "grid grid-cols-2 gap-2 border-t pt-4"
      }
    >
      <Button
        className={compact ? undefined : "col-span-2"}
        size={size}
        render={<Link href={item.scanHref} />}
      >
        <ScanQrCodeIcon />
        Scan Someone&apos;s QR Code
      </Button>
      <Button size={size} onClick={onShowQr}>
        <QrCodeIcon />
        Show QR
      </Button>
      <Button
        size={size}
        variant="primary"
        render={<Link href={item.manualAddHref} />}
      >
        <UserPlusIcon />
        <span>Manual Add</span>
      </Button>
      <Button size={size} render={<Link href={item.resultsHref} />}>
        <BarChart2Icon />
        <span>View Results</span>
      </Button>
    </div>
  );
}

export function ActivePollsList({
  items,
  search,
}: {
  items: ActivePollOverviewItem[];
  search?: string;
}) {
  const [qrItem, setQrItem] = React.useState<ActivePollOverviewItem | null>(
    null,
  );

  if (items.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center">
        <CalendarClockIcon className="mb-4 size-10 text-muted-foreground" />
        <h2 className="font-semibold text-lg">
          {search
            ? `No polls match “${search}”`
            : "No active or upcoming polls"}
        </h2>
        <p className="mt-1 max-w-sm text-muted-foreground text-sm">
          {search
            ? "Try a different filter."
            : "Polls and poll groups will appear here while they are open or after they have been scheduled."}
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-4 md:hidden">
        {items.map((item) => (
          <li
            key={`${item.kind}:${item.id}`}
            className="overflow-hidden rounded-2xl border bg-card shadow-xs"
          >
            <div className="space-y-5 p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {item.kind === "group" ? (
                    <FolderIcon className="size-5" />
                  ) : (
                    <CalendarClockIcon className="size-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 text-muted-foreground text-xs uppercase tracking-wide">
                    {item.kind === "group" ? "Poll group" : "Poll"} ·{" "}
                    {item.status === "open"
                      ? "Active"
                      : item.status === "scheduled"
                        ? "Upcoming"
                        : "Recently ended"}
                  </div>
                  <h2 className="font-semibold text-lg leading-tight">
                    {item.title}
                  </h2>
                  {item.description ? (
                    <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </div>

              <ItemDetails item={item} />
              <PublicResultsLink item={item} />

              <ItemActions item={item} onShowQr={() => setQrItem(item)} />
            </div>
          </li>
        ))}
      </ul>

      <ul className="hidden space-y-3 md:block">
        {items.map((item) => (
          <li
            key={`${item.kind}:${item.id}`}
            className="flex items-center gap-5 rounded-xl border bg-card p-4 shadow-xs"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {item.kind === "group" ? (
                <FolderIcon className="size-5" />
              ) : (
                <CalendarClockIcon className="size-5" />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="truncate font-semibold">{item.title}</h2>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
                  {item.kind === "group" ? "Group" : "Poll"} ·{" "}
                  {item.status === "open"
                    ? "Active"
                    : item.status === "scheduled"
                      ? "Upcoming"
                      : "Recently ended"}
                </span>
              </div>
              <ItemDetails item={item} />
              <PublicResultsLink item={item} />
            </div>
            <ItemActions compact item={item} onShowQr={() => setQrItem(item)} />
          </li>
        ))}
      </ul>

      <Dialog
        open={qrItem !== null}
        onOpenChange={(open) => !open && setQrItem(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Show QR for {qrItem?.title}</DialogTitle>
            <DialogDescription>
              Scan this code to open the public voting page.
            </DialogDescription>
          </DialogHeader>
          {qrItem ? (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-xl border bg-white p-2">
                <QRCodeCanvas
                  level="M"
                  marginSize={4}
                  size={220}
                  title={`QR code for ${qrItem.title}`}
                  value={shortUrl(qrItem.publicHref)}
                />
              </div>
              <p className="w-full break-all rounded-lg bg-muted p-3 text-center text-muted-foreground text-xs">
                {shortUrl(qrItem.publicHref)}
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
