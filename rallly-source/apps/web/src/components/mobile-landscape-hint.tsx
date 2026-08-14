import { Alert, AlertDescription } from "@rallly/ui/alert";
import { SmartphoneIcon } from "lucide-react";

export function MobileLandscapeHint() {
  return (
    <Alert className="hidden max-md:portrait:grid" variant="info">
      <SmartphoneIcon aria-hidden="true" />
      <AlertDescription>
        For a better view of responses, turn your mobile device horizontally.
      </AlertDescription>
    </Alert>
  );
}
