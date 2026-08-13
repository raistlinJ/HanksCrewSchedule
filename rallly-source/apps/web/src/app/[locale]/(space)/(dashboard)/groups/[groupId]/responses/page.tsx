import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getTranslation } from "@/i18n/server";
import { prisma } from "@rallly/database";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { ArrowLeftIcon, DownloadIcon } from "lucide-react";
import { Button } from "@rallly/ui/button";
import { ResponsesMatrix } from "./matrix";

export default async function PollGroupResponsesPage({
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

  // Define formatDate inline for simple display if date/time type
  const formatOption = (opt: any) => {
    if (opt.type === "TEXT") return opt.title;
    if (opt.type === "DATE") {
      const d = new Date(opt.startTime);
      return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    }
    return "Option"; // fallback
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <Link href="/groups" className="text-primary hover:underline flex items-center text-sm font-medium">
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Groups
        </Link>
      </div>

      <div className="mb-8 border-b pb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {group.title} - Responses
          </h1>
          {group.description && (
            <p className="text-md text-muted-foreground whitespace-pre-wrap">
              {group.description}
            </p>
          )}
        </div>
        <a href={`/groups/${group.id}/export/csv`} download>
          <Button variant="outline" className="flex items-center gap-2">
            <DownloadIcon className="w-4 h-4" />
            Export CSV
          </Button>
        </a>
      </div>

      <div className="space-y-12">
        <ResponsesMatrix group={group} />
      </div>
    </div>
  );
}