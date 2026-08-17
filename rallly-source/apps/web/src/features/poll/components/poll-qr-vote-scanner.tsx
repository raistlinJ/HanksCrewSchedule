"use client";

import { Badge } from "@rallly/ui/badge";
import { Button } from "@rallly/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rallly/ui/card";
import { toast } from "@rallly/ui/sonner";
import {
  CameraIcon,
  CheckCircle2Icon,
  ImageIcon,
  ScanQrCodeIcon,
  UsersIcon,
} from "lucide-react";
import QrScanner from "qr-scanner";
import { useCallback, useEffect, useRef, useState } from "react";
import { OptimizedAvatarImage } from "@/components/optimized-avatar-image";
import { parseUserQrCodeValue } from "@/features/user/schema";
import { Trans } from "@/i18n/client";
import { trpc } from "@/trpc/client";

type Voter = {
  id: string;
  userId?: string;
  name: string;
  email: string;
  image?: string;
};

export function PollQrVoteScanner({
  groupId,
  pollId,
  pollTitle,
  initialVoters,
}: {
  groupId?: string;
  pollId: string;
  pollTitle: string;
  initialVoters: Voter[];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const processingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [voters, setVoters] = useState(initialVoters);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const { mutateAsync: markGroupYes } =
    trpc.pollGroups.scanYesVote.useMutation();
  const { mutateAsync: markStandaloneYes } =
    trpc.polls.scanYesVote.useMutation();

  const resumeCamera = useCallback(() => {
    window.setTimeout(() => {
      processingRef.current = false;
      void scannerRef.current
        ?.start()
        .then(() => setCameraActive(true))
        .catch(() => setCameraActive(false));
    }, 900);
  }, []);

  const processQrValue = useCallback(
    async (value: string) => {
      if (processingRef.current) return;
      processingRef.current = true;
      await scannerRef.current?.pause();
      setCameraActive(false);

      const qrCodeToken = parseUserQrCodeValue(value);
      if (!qrCodeToken) {
        toast.error("That is not a valid user QR code");
        resumeCamera();
        return;
      }

      try {
        const result = groupId
          ? await markGroupYes({ groupId, pollId, qrCodeToken })
          : await markStandaloneYes({ pollId, qrCodeToken });
        setVoters((current) => [
          result.voter,
          ...current.filter(
            (voter) =>
              voter.userId !== result.voter.userId &&
              voter.email.toLowerCase() !== result.voter.email.toLowerCase(),
          ),
        ]);

        toast.success(
          result.alreadyYes
            ? `${result.voter.name} was already marked yes for ${pollTitle}`
            : `${result.voter.name} is marked yes for ${pollTitle}`,
        );
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to record vote",
        );
      } finally {
        resumeCamera();
      }
    },
    [groupId, markGroupYes, markStandaloneYes, pollId, pollTitle, resumeCamera],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const scanner = new QrScanner(
      video,
      (result) => void processQrValue(result.data),
      {
        preferredCamera: "environment",
        maxScansPerSecond: 8,
        highlightCodeOutline: true,
        highlightScanRegion: true,
        returnDetailedScanResult: true,
      },
    );
    scannerRef.current = scanner;

    void scanner
      .start()
      .then(() => {
        setCameraActive(true);
        setCameraError(null);
      })
      .catch((error: unknown) => {
        setCameraActive(false);
        setCameraError(
          error instanceof Error
            ? error.message
            : "Camera access is unavailable. You can upload a QR image instead.",
        );
      });

    return () => {
      scanner.destroy();
      scannerRef.current = null;
    };
  }, [processQrValue]);

  const retryCamera = async () => {
    try {
      await scannerRef.current?.start();
      setCameraActive(true);
      setCameraError(null);
    } catch (error) {
      setCameraError(
        error instanceof Error ? error.message : "Camera access is unavailable",
      );
    }
  };

  const scanImage = async (file?: File) => {
    if (!file) return;

    try {
      const result = await QrScanner.scanImage(file, {
        alsoTryWithoutScanRegion: true,
        returnDetailedScanResult: true,
      });
      await processQrValue(result.data);
    } catch {
      toast.error("No QR code was found in that image");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(18rem,2fr)]">
      <Card>
        <CardHeader>
          <CardTitle>
            <ScanQrCodeIcon />
            <Trans i18nKey="scanUserQrCode" defaults="Scan user QR code" />
          </CardTitle>
          <CardDescription>
            {groupId ? (
              <Trans
                i18nKey="scanUserQrCodeDescription"
                defaults="Scan a person's assigned QR code to mark every option in this poll yes. Other polls in the group are not changed."
              />
            ) : (
              "Scan a person's assigned QR code to add them and mark every option in this poll yes."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 border-t">
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              className="size-full object-cover"
              muted
              playsInline
            />
            {!cameraActive ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted p-6 text-center">
                <CameraIcon className="size-10 text-muted-foreground" />
                <p className="max-w-sm text-muted-foreground text-sm">
                  {cameraError ?? "Starting camera…"}
                </p>
                {cameraError ? (
                  <Button size="sm" onClick={retryCamera}>
                    <CameraIcon />
                    <Trans i18nKey="retryCamera" defaults="Retry camera" />
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>

          <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept="image/*"
            onChange={(event) => void scanImage(event.target.files?.[0])}
          />
          <Button
            className="w-full"
            variant="default"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon />
            <Trans i18nKey="scanQrImage" defaults="Scan a QR image" />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>
              <UsersIcon />
              <Trans i18nKey="yesVoters" defaults="Yes voters" />
            </CardTitle>
            <CardDescription>
              <Trans
                i18nKey="yesVoterCount"
                defaults="{count, plural, =0 {Nobody marked yes} one {1 person marked yes} other {# people marked yes}}"
                values={{ count: voters.length }}
              />
            </CardDescription>
          </div>
          <Badge variant="green" size="lg">
            {voters.length}
          </Badge>
        </CardHeader>
        <CardContent className="border-t p-0">
          {voters.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <Trans
                i18nKey="scanFirstVoter"
                defaults="Scan the first person to mark them yes."
              />
            </div>
          ) : (
            <ul className="divide-y">
              {voters.map((voter) => (
                <li
                  key={`${voter.id}-${voter.email}`}
                  className="flex items-center gap-3 p-3"
                >
                  <OptimizedAvatarImage
                    name={voter.name}
                    src={voter.image}
                    size="lg"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-sm">
                      {voter.name}
                    </div>
                    <div className="truncate text-muted-foreground text-xs">
                      {voter.email}
                    </div>
                  </div>
                  <CheckCircle2Icon className="size-5 shrink-0 text-green-600" />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
