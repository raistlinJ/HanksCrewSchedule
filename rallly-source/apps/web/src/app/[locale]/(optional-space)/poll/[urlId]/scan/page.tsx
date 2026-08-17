import { PollQrVoteScanner } from "@/features/poll/components/poll-qr-vote-scanner";
import { loadManagedPollForQrVoting } from "@/features/poll/loaders";

export default async function PollQrVotingPage({
  params,
}: {
  params: Promise<{ urlId: string }>;
}) {
  const { urlId } = await params;
  const poll = await loadManagedPollForQrVoting({ pollId: urlId });
  const initialVoters = Array.from(
    new Map(
      poll.participants.map((participant) => [
        participant.user?.id ??
          participant.email?.toLowerCase() ??
          participant.id,
        {
          id: participant.id,
          userId: participant.user?.id,
          name: participant.name,
          email: participant.email ?? "",
          image: participant.user?.image ?? undefined,
        },
      ]),
    ).values(),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl">{poll.title}</h1>
        <p className="text-muted-foreground text-sm">Poll QR voting</p>
      </div>
      <PollQrVoteScanner
        pollId={poll.id}
        pollTitle={poll.title}
        initialVoters={initialVoters}
      />
    </div>
  );
}
