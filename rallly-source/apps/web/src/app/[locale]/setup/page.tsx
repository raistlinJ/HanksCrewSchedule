import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SetupFooter } from "@/app/[locale]/setup/components/setup-footer";
import { SetupForm } from "@/app/[locale]/setup/components/setup-form";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Logo } from "@/features/branding/components/logo";
import { getAnySpaceMembership, getOwnedSpace } from "@/features/space/data";
import { listPendingSpaceInvites } from "@/features/space/member/data";
import { getCurrentUser, requireUser } from "@/features/user/loaders";
import { Trans } from "@/i18n/client";
import { getTranslation } from "@/i18n/server";
import { getDeviceDateTimeConfig } from "@/lib/datetime/server";
import { validateRedirectUrl } from "@/lib/utils/redirect";

export default async function SetupPage(props: {
  searchParams?: Promise<{ redirectTo?: string }>;
}) {
  // requireUser provides the normal login redirect. The database-backed
  // lookup then rejects a signed cookie-cache session whose user was removed
  // by an archive restore instead of rendering a form that can never submit.
  await requireUser();
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const searchParams = await props.searchParams;

  // Use all memberships rather than only effective/active ones: completing a
  // profile must never create a second space for an existing member. Pending
  // invitees also complete only their profile before returning to the invite.
  const [ownedSpace, membership, pendingInvites] = await Promise.all([
    getOwnedSpace(user.id),
    getAnySpaceMembership(user.id),
    listPendingSpaceInvites(user.email),
  ]);
  const hasSpace = Boolean(ownedSpace ?? membership);
  const safeRedirect = validateRedirectUrl(searchParams?.redirectTo);

  if (user.name && hasSpace) {
    redirect(safeRedirect ?? "/");
  }

  if (user.name && pendingInvites.length > 0) {
    const requestedInvite = pendingInvites.find(
      ({ id }) => safeRedirect === `/accept-invite/${id}`,
    );
    const nextInvite = requestedInvite ?? pendingInvites[0];
    if (nextInvite) {
      redirect(`/accept-invite/${nextInvite.id}`);
    }
  }

  const requiresSpace = !hasSpace && pendingInvites.length === 0;

  // Prefill from the device: the timeZone cookie tracks the browser's zone
  // on every visit, and the format cookie holds a per-device choice.
  const device = await getDeviceDateTimeConfig();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-3">
        <Logo size="sm" />
        <ThemeSwitcher />
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="flex flex-1 overflow-y-auto p-4"
      >
        <article className="m-auto w-full max-w-sm space-y-8">
          <header>
            <h1 className="font-bold text-2xl">
              <Trans
                i18nKey={
                  requiresSpace ? "createFirstSpaceTitle" : "setupAccountTitle"
                }
                defaults={
                  requiresSpace
                    ? "Create your first space"
                    : "Set up your account"
                }
              />
            </h1>
            <p className="mt-1 text-muted-foreground">
              <Trans
                i18nKey={
                  requiresSpace
                    ? "createFirstSpaceDescription"
                    : "setupAccountDescription"
                }
                defaults={
                  requiresSpace
                    ? "Create a space before getting started."
                    : "Tell us a bit about yourself."
                }
              />
            </p>
          </header>
          <div>
            <SetupForm
              defaultName={user.name}
              defaultTimeZone={user.timeZone ?? device.timeZone}
              defaultTimeFormat={user.timeFormat ?? device.timeFormat}
              requiresSpace={requiresSpace}
            />
          </div>
        </article>
      </main>
      <footer className="flex justify-center p-16">
        <SetupFooter email={user.email} />
      </footer>
    </div>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation();
  return {
    title: t("setupAccountTitle", {
      defaultValue: "Set up your account",
    }),
  };
}
