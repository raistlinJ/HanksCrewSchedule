import { buttonVariants } from "@rallly/ui";
import { LockIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  EmptyState,
  EmptyStateDescription,
  EmptyStateFooter,
  EmptyStateIcon,
  EmptyStateTitle,
} from "@/components/empty-state";
import { IfCloudHosted, IfSelfHosted } from "@/components/environment";
import { isInitialAdmin } from "@/features/instance-settings/utils";
import { getCurrentUser } from "@/features/user/loaders";
import { Trans } from "@/i18n/client";
import { getTranslation } from "@/i18n/server";
import { getPathname } from "@/lib/pathname";
import { buildSafeRedirectUrl } from "@/lib/utils/redirect";
import { SignedInAs } from "./signed-in-as";

export default async function AdminSetupPage() {
  // Read the role from the database — the session cookie cache can hold
  // a stale role.
  const user = await getCurrentUser();

  if (!user) {
    redirect(
      buildSafeRedirectUrl({
        destination: "/login",
        returnUrl: await getPathname(),
      }),
    );
  }

  // Existing admins go straight through. The configured initial admin is
  // promoted by requireAdmin when the control panel handles this redirect.
  if (user.role === "admin" || isInitialAdmin(user.email)) {
    redirect("/control-panel");
  }

  return (
    <main id="main-content" tabIndex={-1} className="flex h-dvh flex-col p-4">
      <EmptyState className="flex-1">
        <EmptyStateIcon>
          <LockIcon />
        </EmptyStateIcon>
        <EmptyStateTitle>
          <Trans
            i18nKey="adminAccessRequired"
            defaults="Administrator access required"
          />
        </EmptyStateTitle>
        <EmptyStateDescription>
          <IfCloudHosted>
            <Trans
              i18nKey="adminAccessRequiredDescription"
              defaults="You need administrator access to view this page."
            />
          </IfCloudHosted>
          <IfSelfHosted>
            <Trans
              i18nKey="adminAccessRequiredSelfHostedHint"
              defaults="If you are the owner of this instance, check that INITIAL_ADMIN_EMAIL is set to the email address of the administrator account."
            />
          </IfSelfHosted>
        </EmptyStateDescription>
        <EmptyStateFooter className="flex gap-2">
          <Link href="/" className={buttonVariants()}>
            <Trans i18nKey="backToHome" defaults="Back to home" />
          </Link>
          <IfSelfHosted>
            <a
              target="_blank"
              rel="noreferrer"
              href="https://support.rallly.co/self-hosting/control-panel"
              className={buttonVariants({ variant: "primary" })}
            >
              <Trans i18nKey="learnMore" defaults="Learn more" />
            </a>
          </IfSelfHosted>
        </EmptyStateFooter>
      </EmptyState>
      <div className="pb-6">
        <SignedInAs
          name={user.name}
          email={user.email}
          image={user.image ?? undefined}
        />
      </div>
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { t } = await getTranslation(locale);
  return {
    title: t("adminSetup", { defaultValue: "Admin setup" }),
  };
}
