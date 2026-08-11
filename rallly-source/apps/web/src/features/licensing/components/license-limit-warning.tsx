import Link from "next/link";
import { Trans } from "react-i18next/TransWithoutContext";
import { DEFAULT_SEAT_LIMIT } from "@/features/licensing/constants";
import { loadInstanceLicense } from "@/features/licensing/data";
import { getUserCount } from "@/features/user/data";
import { getTranslation } from "@/i18n/server";
import { isSelfHosted } from "@/lib/constants";

export async function LicenseLimitWarning() {
  return null;
}
