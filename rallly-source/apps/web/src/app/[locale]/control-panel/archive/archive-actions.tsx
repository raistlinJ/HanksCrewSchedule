"use client";

import { Button } from "@rallly/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rallly/ui/dialog";
import { Input } from "@rallly/ui/input";
import { toast } from "@rallly/ui/sonner";
import { DownloadIcon, UploadIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Trans } from "@/i18n/client";

const RESTORE_CONFIRMATION = "RESTORE";

const restoreErrorMessages: Record<string, string> = {
  archive_restore_failed:
    "The database could not restore this archive. No data was changed.",
  archive_too_large: "This archive is too large to restore.",
  forbidden: "Your administrator session has expired. Sign in and try again.",
  invalid_archive: "This file is not a valid archive.",
  invalid_origin:
    "The restore request came from an unexpected address. Open the configured application URL and try again.",
};

export function DownloadArchiveButton() {
  return (
    <Button render={<a href="/api/admin/archive" download />}>
      <DownloadIcon />
      <Trans i18nKey="downloadArchive" defaults="Download archive" />
    </Button>
  );
}

export function RestoreArchiveButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);

  const chooseArchive = () => fileInputRef.current?.click();

  const restore = async () => {
    if (!file || confirmation !== RESTORE_CONFIRMATION) return;

    setIsRestoring(true);
    try {
      const response = await fetch("/api/admin/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: file,
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "archive_restore_failed");
      }

      // The restore response expires the old database session and signed
      // cookie cache. A fresh login picks up the restored user's identity.
      window.location.assign("/login");
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown_error";
      toast.error(
        restoreErrorMessages[reason] ??
          "The archive could not be restored. No data was changed.",
      );
      setIsRestoring(false);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          const selected = event.target.files?.[0] ?? null;
          event.target.value = "";
          if (!selected) return;
          setFile(selected);
          setConfirmation("");
          setOpen(true);
        }}
      />
      <Button onClick={chooseArchive}>
        <UploadIcon />
        <Trans i18nKey="restoreArchive" defaults="Restore archive" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Trans i18nKey="restoreArchive" defaults="Restore archive" />
            </DialogTitle>
            <DialogDescription>
              This replaces all users, spaces, polls, poll groups, events, and
              responses with the contents of <strong>{file?.name}</strong>.
              Instance settings and licensing are not changed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="archive-confirmation" className="text-sm">
              Type <strong>{RESTORE_CONFIRMATION}</strong> to continue.
            </label>
            <Input
              id="archive-confirmation"
              autoComplete="off"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button />}>
              <Trans i18nKey="cancel" defaults="Cancel" />
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={confirmation !== RESTORE_CONFIRMATION}
              loading={isRestoring}
              onClick={restore}
            >
              <Trans i18nKey="restore" defaults="Restore" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
