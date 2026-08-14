import { cn } from "@rallly/ui";
import Image from "next/image";
import { hanksThemeImage } from "@/assets";

export function HanksThemeLogo({
  className,
  preload = false,
}: {
  className?: string;
  preload?: boolean;
}) {
  return (
    <Image
      src={hanksThemeImage}
      alt="Hanks Crew App"
      className={cn("h-auto w-32 object-contain", className)}
      sizes="(max-width: 640px) 8rem, 11rem"
      preload={preload}
    />
  );
}
