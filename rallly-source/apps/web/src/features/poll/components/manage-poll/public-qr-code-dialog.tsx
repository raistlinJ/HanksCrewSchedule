"use client";

import { Button } from "@rallly/ui/button";
import type { DialogProps } from "@rallly/ui/dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@rallly/ui/dialog";
import { toast } from "@rallly/ui/sonner";
import { CopyIcon, DownloadIcon } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useRef, useState } from "react";
import { createLabeledQrCodePng } from "@/lib/labeled-qr-code";

export function PublicPollQrCodeDialog({
  pollTitle,
  publicUrl,
  ...dialogProps
}: DialogProps & {
  pollTitle: string;
  publicUrl: string;
}) {
  const downloadQrCodeRef = useRef<HTMLCanvasElement>(null);
  const [saving, setSaving] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Public poll link copied");
    } catch {
      toast.error("Unable to copy the public poll link");
    }
  };

  const saveQrCode = async () => {
    const canvas = downloadQrCodeRef.current;
    if (!canvas) {
      toast.error("Unable to save QR code");
      return;
    }

    setSaving(true);
    try {
      const fileName =
        pollTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") || "poll";
      const blob = await createLabeledQrCodePng(canvas, pollTitle);
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
      setSaving(false);
    }
  };

  return (
    <Dialog {...dialogProps}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Public page QR code</DialogTitle>
          <DialogDescription>
            Scan this code to open the public voting page for {pollTitle}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-xl border bg-white p-2">
            <QRCodeCanvas
              level="M"
              marginSize={4}
              size={256}
              title={`Public page QR code for ${pollTitle}`}
              value={publicUrl}
            />
          </div>
          <QRCodeCanvas
            aria-hidden="true"
            className="hidden"
            level="M"
            marginSize={4}
            ref={downloadQrCodeRef}
            size={1024}
            value={publicUrl}
          />
          <p className="w-full break-all rounded-md bg-muted p-3 text-center text-muted-foreground text-xs">
            {publicUrl}
          </p>
          <div className="grid w-full grid-cols-2 gap-2">
            <Button onClick={copyLink}>
              <CopyIcon />
              Copy link
            </Button>
            <Button loading={saving} onClick={saveQrCode}>
              <DownloadIcon />
              Save image
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
