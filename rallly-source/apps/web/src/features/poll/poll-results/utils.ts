export type ResultResponse = "yes" | "ifNeedBe" | "no";

const responseRank: Record<ResultResponse, number> = {
  yes: 0,
  ifNeedBe: 1,
  no: 2,
};

export function getOverallResponse(
  votes: ReadonlyArray<{ type: ResultResponse }>,
): ResultResponse {
  if (votes.some((vote) => vote.type === "yes")) {
    return "yes";
  }
  if (votes.some((vote) => vote.type === "ifNeedBe")) {
    return "ifNeedBe";
  }
  return "no";
}

export function getLatestVoteDate(
  votes: ReadonlyArray<{ createdAt: Date; updatedAt: Date | null }>,
) {
  return votes.reduce<Date | null>((latest, vote) => {
    const voteDate = vote.updatedAt ?? vote.createdAt;
    return !latest || voteDate > latest ? voteDate : latest;
  }, null);
}

export function sortParticipantsByResponse<
  T extends { name: string; votes: ReadonlyArray<{ type: ResultResponse }> },
>(participants: ReadonlyArray<T>) {
  return participants
    .map((participant) => ({
      participant,
      response: getOverallResponse(participant.votes),
    }))
    .sort(
      (a, b) =>
        responseRank[a.response] - responseRank[b.response] ||
        a.participant.name.localeCompare(b.participant.name),
    );
}

export function getResponseTotals(
  rows: ReadonlyArray<{ response: ResultResponse }>,
) {
  return rows.reduce(
    (totals, row) => {
      totals[row.response] += 1;
      return totals;
    },
    { yes: 0, ifNeedBe: 0, no: 0 },
  );
}

export function filterResultParticipants<
  T extends {
    name: string;
    email?: string | null;
    auxiliaryVotes?: ReadonlyArray<{
      auxiliaryOptionId: string;
      type: ResultResponse;
    }>;
  },
>(
  participants: ReadonlyArray<T>,
  filter: string,
  auxiliarySelection?: {
    name: string;
    options: ReadonlyArray<{ id: string; label: string }>;
  } | null,
) {
  const normalizedFilter = filter.trim().toLowerCase();
  if (!normalizedFilter) return [...participants];

  const matchingAuxiliaryOptionIds = new Set(
    auxiliarySelection?.options
      .filter(
        (option) =>
          option.label.toLowerCase().includes(normalizedFilter) ||
          auxiliarySelection.name.toLowerCase().includes(normalizedFilter),
      )
      .map((option) => option.id) ?? [],
  );

  return participants.filter((participant) => {
    if (
      participant.name.toLowerCase().includes(normalizedFilter) ||
      participant.email?.toLowerCase().includes(normalizedFilter)
    ) {
      return true;
    }

    return participant.auxiliaryVotes?.some(
      (vote) =>
        vote.type === "yes" &&
        matchingAuxiliaryOptionIds.has(vote.auxiliaryOptionId),
    );
  });
}

export function isPublicPollResultsPath(pathname: string) {
  return /\/invite\/[^/]+\/results\/?$/.test(pathname);
}

export function redactPublicResultParticipants<
  T extends { email: string | null; note: string | null },
>(participants: ReadonlyArray<T>) {
  return participants.map((participant) => ({
    ...participant,
    email: null,
    note: null,
  }));
}
