export function normalizePollAccessEmail(email: string) {
  return email.trim().toLowerCase();
}

export function canAccessParticipantByEmail({
  requireEmailVerification,
  participantEmail,
  accessEmail,
}: {
  requireEmailVerification: boolean;
  participantEmail: string | null;
  accessEmail: string | null;
}) {
  return (
    !requireEmailVerification &&
    !!participantEmail &&
    !!accessEmail &&
    normalizePollAccessEmail(participantEmail) ===
      normalizePollAccessEmail(accessEmail)
  );
}

export function shouldRequirePollEmailGate({
  requireEmailVerification,
  impersonatedUserId,
}: {
  requireEmailVerification: boolean;
  impersonatedUserId: string | null;
}) {
  return !requireEmailVerification && !impersonatedUserId;
}
