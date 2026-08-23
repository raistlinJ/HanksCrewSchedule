"use client";

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
  ImageIcon,
  Loader2Icon,
  ScanQrCodeIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import QrScanner from "qr-scanner";
import { useCallback, useEffect, useRef, useState } from "react";
import { parseUserQrCodeValue } from "@/features/user/schema";
import { trpc } from "@/trpc/client";

export function PollGroupQrScanner({ groupId }: { groupId: string }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const processingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [openingFor, setOpeningFor] = useState<string | null>(null);
  const { mutateAsync: scanGroupVoter } =
    trpc.pollGroups.scanGroupVoter.useMutation();

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
        const result = await scanGroupVoter({ groupId, qrCodeToken });
        setOpeningFor(result.voter.name);
        router.push(result.votingHref);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to open the group voting page",
        );
        resumeCamera();
      }
    },
    [groupId, resumeCamera, router, scanGroupVoter],
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
    } catch (error) {
      if (!processingRef.current) {
        toast.error("No QR code was found in that image");
      } else if (error instanceof Error) {
        toast.error(error.message);
      }
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <CardTitle>
          <ScanQrCodeIcon />
          Scan Someone&apos;s QR Code
        </CardTitle>
        <CardDescription>
          Scan a person&apos;s assigned QR code to open the poll group voting
          page with their response loaded. Scanning does not submit or change
          any votes.
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
              {openingFor ? (
                <>
                  <Loader2Icon className="size-10 animate-spin text-primary" />
                  <p className="font-medium text-sm">
                    Opening the voting page for {openingFor}…
                  </p>
                </>
              ) : (
                <>
                  <CameraIcon className="size-10 text-muted-foreground" />
                  <p className="max-w-sm text-muted-foreground text-sm">
                    {cameraError ?? "Starting camera…"}
                  </p>
                  {cameraError ? (
                    <Button size="sm" onClick={retryCamera}>
                      <CameraIcon />
                      Retry camera
                    </Button>
                  ) : null}
                </>
              )}
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
          disabled={openingFor !== null}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon />
          Scan a QR image
        </Button>
      </CardContent>
    </Card>
  );
}
