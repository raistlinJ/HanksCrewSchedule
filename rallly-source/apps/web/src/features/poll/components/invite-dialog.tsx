import { buttonVariants } from "@rallly/ui";
import { Button } from "@rallly/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@rallly/ui/dialog";
import { toast } from "@rallly/ui/sonner";

import { ArrowUpRightIcon, DownloadIcon, Share2Icon } from "lucide-react";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import React from "react";
import { useCopyToClipboard } from "react-use";

import { usePoll } from "@/features/poll/client";
import { Trans } from "@/i18n/client";
import { createLabeledQrCodePng } from "@/lib/labeled-qr-code";

export function CopyInviteLinkButton() {
  const [didCopy, setDidCopy] = React.useState(false);
  const [state, copyToClipboard] = useCopyToClipboard();
  const poll = usePoll();
  const inviteLinkWithoutProtocol = poll.inviteLink.replace(/^https?:\/\//, "");

  React.useEffect(() => {
    if (state.error) {
      console.error(`Unable to copy value: ${state.error.message}`);
    }
  }, [state]);

  return (
    <Button
      className="min-w-0 grow"
      onClick={() => {
        copyToClipboard(poll.inviteLink);
        setDidCopy(true);
        setTimeout(() => {
          setDidCopy(false);
        }, 1000);
      }}
    >
      {didCopy ? (
        <Trans i18nKey="copied" />
      ) : (
        <span className="min-w-0 truncate">{inviteLinkWithoutProtocol}</span>
      )}
    </Button>
  );
}

export const InviteDialog = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSavingQrCode, setIsSavingQrCode] = React.useState(false);
  const downloadQrCodeRef = React.useRef<HTMLCanvasElement>(null);
  const poll = usePoll();

  const saveQrCode = async () => {
    const canvas = downloadQrCodeRef.current;
    if (!canvas) {
      toast.error("Unable to save QR code");
      return;
    }

    setIsSavingQrCode(true);
    try {
      const fileName =
        poll.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") || "poll";
      const blob = await createLabeledQrCodePng(canvas, poll.title);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `${fileName}-public-page-qr.png`;
      link.href = url;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      toast.error("Unable to save QR code");
    } finally {
      setIsSavingQrCode(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button variant="primary" />}>
        <Share2Icon data-icon="inline-start" />
        <span className="sr-only sm:not-sr-only">
          <Trans i18nKey="share" defaults="Share" />
        </span>
      </DialogTrigger>
      <DialogContent data-testid="invite-participant-dialog">
        <div className="flex">
          <Share2Icon className="size-6 text-primary" />
        </div>
        <DialogHeader className="">
          <DialogTitle>
            <Trans i18nKey="share" defaults="Share" />
          </DialogTitle>
          <DialogDescription>
            <Trans
              i18nKey="inviteParticipantsDescription"
              defaults="Copy and share the invite link to start gathering responses from your participants."
            />
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-muted/30 p-3">
          <p className="font-medium text-sm">Scan to open the public poll</p>
          <div className="rounded-xl border bg-white p-2">
            <QRCodeCanvas
              className="h-auto w-full max-w-52"
              level="M"
              marginSize={4}
              size={208}
              title={`Public page QR code for ${poll.title}`}
              value={poll.inviteLink}
            />
          </div>
          <QRCodeCanvas
            aria-hidden="true"
            className="hidden"
            level="M"
            marginSize={4}
            ref={downloadQrCodeRef}
            size={1024}
            value={poll.inviteLink}
          />
          <Button size="sm" loading={isSavingQrCode} onClick={saveQrCode}>
            <DownloadIcon />
            Save QR code
          </Button>
        </div>
        <div className="min-w-0">
          <p className="mb-2 text-sm">
            <Trans i18nKey="inviteLink" defaults="Invite link" />
          </p>
          <div className="flex gap-2">
            <CopyInviteLinkButton />
            <div className="shrink-0">
              <Link
                target="_blank"
                href={`/invite/${poll.id}`}
                prefetch={false}
                className={buttonVariants()}
              >
                <ArrowUpRightIcon className="size-4" />
              </Link>
            </div>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          <Trans
            i18nKey="inviteParticipantLinkInfo"
            defaults="Anyone with this link will be able to vote on your poll."
          />
        </p>
      </DialogContent>
    </Dialog>
  );
};
