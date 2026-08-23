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
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import React from "react";
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

function ItemActions({
  item,
  compact,
  onShowQr,
  onChooseScan,
}: {
  item: ActivePollOverviewItem;
  compact?: boolean;
  onShowQr: () => void;
  onChooseScan: () => void;
}) {
  const scanHref = item.kind === "poll" ? item.polls[0]?.scanHref : undefined;
  const size = compact ? "sm" : "default";
  return (
    <div
      className={
        compact
          ? "flex max-w-96 shrink-0 flex-wrap items-center justify-end gap-2"
          : "grid grid-cols-2 gap-2 border-t pt-4"
      }
    >
      {scanHref ? (
        <Button size={size} render={<Link href={scanHref} />}>
          <ScanQrCodeIcon />
          Scan
        </Button>
      ) : (
        <Button size={size} onClick={onChooseScan}>
          <ScanQrCodeIcon />
          Scan
        </Button>
      )}
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
}: {
  items: ActivePollOverviewItem[];
}) {
  const [qrItem, setQrItem] = React.useState<ActivePollOverviewItem | null>(
    null,
  );
  const [scanGroup, setScanGroup] =
    React.useState<ActivePollOverviewItem | null>(null);

  if (items.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center">
        <CalendarClockIcon className="mb-4 size-10 text-muted-foreground" />
        <h2 className="font-semibold text-lg">No active or upcoming polls</h2>
        <p className="mt-1 max-w-sm text-muted-foreground text-sm">
          Polls and poll groups will appear here while they are open or after
          they have been scheduled.
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

              <ItemActions
                item={item}
                onShowQr={() => setQrItem(item)}
                onChooseScan={() => setScanGroup(item)}
              />
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
            </div>
            <ItemActions
              compact
              item={item}
              onShowQr={() => setQrItem(item)}
              onChooseScan={() => setScanGroup(item)}
            />
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

      <Dialog
        open={scanGroup !== null}
        onOpenChange={(open) => !open && setScanGroup(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose a poll to scan</DialogTitle>
            <DialogDescription>
              A scanned user is added to one poll at a time.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {scanGroup?.polls.map((poll) => (
              <Button
                key={poll.id}
                className="h-auto justify-between py-3"
                render={<Link href={poll.scanHref} />}
              >
                <span className="truncate">{poll.title}</span>
                <ScanQrCodeIcon className="size-4 shrink-0" />
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
