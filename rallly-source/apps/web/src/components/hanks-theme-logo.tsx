import { cn } from "@rallly/ui";
import Image from "next/image";
import { hanksThemeImage } from "@/assets";

// assetPrefix makes static imports absolute in self-hosted production builds.
// Passing that absolute loopback/private URL to the Next image optimizer is
// rejected by its SSRF protection, even though the asset is bundled locally.
// Keep the static image metadata while making its source same-origin.
const localHanksThemeImage = {
  ...hanksThemeImage,
  src: new URL(hanksThemeImage.src, "http://localhost").pathname,
};

export function HanksThemeLogo({
  className,
  preload = false,
}: {
  className?: string;
  preload?: boolean;
}) {
  return (
    <Image
      src={localHanksThemeImage}
      alt="Hanks Crew App"
      className={cn("h-auto w-32 object-contain", className)}
      sizes="(max-width: 640px) 8rem, 11rem"
      preload={preload}
    />
  );
}
