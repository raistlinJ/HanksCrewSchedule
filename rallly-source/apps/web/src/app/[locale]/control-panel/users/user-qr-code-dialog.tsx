"use client";

import { Button } from "@rallly/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@rallly/ui/dialog";
import { toast } from "@rallly/ui/sonner";
import { DownloadIcon } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useRef, useState } from "react";
import { createUserQrCodeValue } from "@/features/user/schema";
import { Trans } from "@/i18n/client";
import { createLabeledQrCodePng } from "@/lib/labeled-qr-code";

export function UserQrCodeDialog({
  open,
  onOpenChange,
  name,
  qrCodeToken,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  qrCodeToken: string;
}) {
  const downloadQrCodeRef = useRef<HTMLCanvasElement>(null);
  const [saving, setSaving] = useState(false);
  const qrCodeValue = createUserQrCodeValue(qrCodeToken);

  const saveQrCode = async () => {
    const canvas = downloadQrCodeRef.current;
    if (!canvas) {
      toast.error("Unable to save QR code");
      return;
    }

    setSaving(true);
    try {
      const fileName =
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") || "user";
      const blob = await createLabeledQrCodePng(canvas, name);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `${fileName}-check-in-qr.png`;
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            <Trans
              i18nKey="userCheckInQrCode"
              defaults="{name}'s check-in QR code"
              values={{ name }}
            />
          </DialogTitle>
          <DialogDescription>
            <Trans
              i18nKey="userCheckInQrCodeDescription"
              defaults="Scan this code from an event check-in page to mark this person as attending. Treat it like a badge."
            />
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-xl border bg-white p-2 text-center text-black">
            <QRCodeCanvas
              level="M"
              marginSize={4}
              size={256}
              title={`Check-in QR code for ${name}`}
              value={qrCodeValue}
            />
            <div className="max-w-64 break-words px-2 pb-2 font-semibold">
              {name}
            </div>
          </div>
          <QRCodeCanvas
            aria-hidden="true"
            className="hidden"
            level="M"
            marginSize={4}
            ref={downloadQrCodeRef}
            size={1024}
            value={qrCodeValue}
          />
          <Button className="w-full" loading={saving} onClick={saveQrCode}>
            <DownloadIcon />
            <Trans i18nKey="saveQrCode" defaults="Save QR code" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
