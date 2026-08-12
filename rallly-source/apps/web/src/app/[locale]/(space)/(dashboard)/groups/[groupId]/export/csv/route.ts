import { NextResponse } from "next/server";
import { prisma } from "@rallly/database";
import { getSession } from "@/lib/auth";
import { getTranslation } from "@/i18n/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string; locale: string }> }
) {
  const { groupId, locale } = await params;
  const session = await getSession();

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const group = await prisma.pollGroup.findUnique({
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

  if (!group) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Ensure user has access to this space
  const member = await prisma.spaceMember.findFirst({
    where: {
      spaceId: group.spaceId,
      userId: session.user.id
    }
  });

  if (!member) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Sort polls according to the pollOrder array from the database
  if (group.pollOrder && group.pollOrder.length > 0) {
    group.polls.sort((a, b) => {
      const indexA = group.pollOrder.indexOf(a.id);
      const indexB = group.pollOrder.indexOf(b.id);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }

  // Need translation function to get "Yes", "No", "If Need Be"
  const { t } = await getTranslation(locale);
  
  // Format dates
  const formatOption = (opt: any) => {
    if (opt.type === "TEXT") return opt.title;
    if (opt.type === "DATE") {
      const d = new Date(opt.startTime);
      // Using locale for date formatting
      return new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }).format(d);
    }
    return "Option";
  };

  const rows: string[] = [];
  
  for (const poll of group.polls) {
    if (poll.participants.length === 0) continue;
    
    // Add Poll Title as a header row for this section
    rows.push(`"${poll.title.replace(/"/g, '""')}"`);
    
    // Header for the poll matrix
    const header = [
      t("name", { defaultValue: "Name" }),
      t("email", { defaultValue: "Email" }),
      ...poll.options.map((opt: any) => `"${formatOption(opt).replace(/"/g, '""')}"`)
    ].join(",");
    rows.push(header);
    
    // Rows for each participant
    for (const participant of poll.participants) {
      const row = [
        `"${participant.name.replace(/"/g, '""')}"`,
        `"${(participant.email || "").replace(/"/g, '""')}"`,
        ...poll.options.map((opt: any) => {
          const vote = participant.votes.find((v: any) => v.optionId === opt.id);
          const voteType = vote?.type || "no";
          if (voteType === "yes") return t("yes");
          if (voteType === "ifNeedBe") return t("ifNeedBe");
          return t("no");
        })
      ].join(",");
      rows.push(row);
    }
    
    // Add a blank row between polls
    rows.push("");
  }
  
  const csv = `\uFEFF${rows.join("\r\n")}`; // Include BOM for Excel UTF-8 support
  
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${group.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_responses.csv"`,
    },
  });
}
