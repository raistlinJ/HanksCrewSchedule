import { prisma } from "@rallly/database";
import { Button } from "@rallly/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HanksThemeLogo } from "@/components/hanks-theme-logo";
import { getSession } from "@/lib/auth";

// Voting Client Component
import VotingClient from "./VotingClient";

export default async function PublicPollGroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string; locale: string }>;
  searchParams: Promise<{ manualAdd?: string | string[] }>;
}) {
  const { groupId } = await params;
  const isManualAdd = (await searchParams).manualAdd === "1";
  const session = await getSession();

  const group = await prisma.pollGroup
    .findUnique({
      where: { id: groupId },
      include: {
        polls: {
          where: { deleted: false },
          include: {
            options: {
              orderBy: { startTime: "asc" },
            },
            auxiliarySelection: {
              include: { options: { orderBy: { position: "asc" } } },
            },
            participants: {
              where: { deleted: false },
              include: { votes: true, auxiliaryVotes: true },
            },
          },
        },
      },
    })
    .catch(() => null);

  if (!group) {
    return notFound();
  }

  // Sort polls according to the pollOrder array from the database
  if (group.pollOrder && group.pollOrder.length > 0) {
    group.polls.sort((a, b) => {
      const indexA = group.pollOrder.indexOf(a.id);
      const indexB = group.pollOrder.indexOf(b.id);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1; // Unordered items go to the end
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-6 flex justify-center">
        <HanksThemeLogo className="w-24 sm:w-28" preload />
      </div>
      <div className="mb-8 border-b pb-8">
        <h1 className="mb-2 font-extrabold text-4xl tracking-tight">
          {group.title}
        </h1>
        {group.description && (
          <p className="whitespace-pre-wrap text-lg text-muted-foreground">
            {group.description}
          </p>
        )}
        {group.publicResults ? (
          <div className="mt-4">
            <Button render={<Link href={`/g/${group.id}/results`} />}>
              View full results
            </Button>
          </div>
        ) : null}
      </div>

      <VotingClient
        group={group}
        manualAdd={isManualAdd}
        userEmail={isManualAdd ? null : session?.user?.email || null}
      />
    </div>
  );
}
