import { Trans } from "react-i18next/TransWithoutContext";

import { createEmailI18n } from "../i18n";
import type { EmailChrome } from "../types";
import { Link, Text } from "./styled-components";

export async function PoweredBy({
  chrome,
  locale = "en",
}: {
  chrome: EmailChrome;
  locale?: string;
}) {
  if (chrome.hideAttribution) {
    return null;
  }

  const { t, i18n } = await createEmailI18n(locale);

  return (
    <Text small light={true}>
      An app by Acosta3d for Hanks Crew App
    </Text>
  );
}
