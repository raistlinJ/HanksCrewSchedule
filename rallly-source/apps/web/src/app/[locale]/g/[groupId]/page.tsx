import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getTranslation } from "@/i18n/server";
import { Button } from "@rallly/ui/button";
import { prisma } from "@rallly/database";
import { getSession } from "@/lib/auth";

// Voting Client Component
import VotingClient from "./VotingClient";

export default async function PublicPollGroupPage({
  params,
}: {
  params: Promise<{ groupId: string; locale: string }>;
}) {
  const { groupId, locale } = await params;
  const session = await getSession();

  let group;
  try {
    group = await prisma.pollGroup.findUnique({
      where: { id: groupId },
      include: {
        polls: {
          where: { deleted: false },
          include: {
            options: {
              orderBy: { startTime: "asc" },
            },
            participants: {
              where: { deleted: false },
              include: { votes: true },
            },
          },
        },
      },
    });
  } catch (error) {
    return notFound();
  }

  if (!group) {
    return notFound();
  }

  const { t } = await getTranslation(locale);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 border-b pb-8">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">
          {group.title}
        </h1>
        {group.description && (
          <p className="text-lg text-muted-foreground whitespace-pre-wrap">
            {group.description}
          </p>
        )}
      </div>

      <VotingClient group={group} userEmail={session?.user?.email || null} />
    </div>
  );
}
