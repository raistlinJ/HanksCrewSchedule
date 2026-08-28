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

  if (!group.spaceId) {
    return new NextResponse("Forbidden", { status: 403 });
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
  const participantMap = new Map<string, { name: string; email: string; intervals: any[] }>();

  for (const poll of group.polls) {
    if (poll.participants.length === 0) continue;

    for (const participant of poll.participants) {
      const key = participant.email ? participant.email.toLowerCase() : participant.name.toLowerCase();
      
      if (!participantMap.has(key)) {
        participantMap.set(key, {
          name: participant.name,
          email: participant.email || "",
          intervals: []
        });
      }
      
      const pData = participantMap.get(key)!;
      
      const yesOptions = poll.options.filter((opt: any) => {
        const vote = participant.votes.find((v: any) => v.optionId === opt.id);
        return vote?.type === "yes";
      });
      
      for (const opt of yesOptions) {
        const start = new Date(opt.startTime).getTime();
        const duration = opt.duration || 0;
        pData.intervals.push({ start, end: start + (duration * 60 * 1000) });
      }
    }
  }

  const rows: string[] = [];
  rows.push([
    t("name", { defaultValue: "Name" }),
    t("email", { defaultValue: "Email" }),
    "Total Hours"
  ].join(","));

  for (const pData of Array.from(participantMap.values())) {
    let totalMs = 0;
    
    if (pData.intervals.length > 0) {
      pData.intervals.sort((a, b) => a.start - b.start);
      const merged = [pData.intervals[0]];
      
      for (let i = 1; i < pData.intervals.length; i++) {
        const current = pData.intervals[i];
        const previous = merged[merged.length - 1];
        
        if (current.start <= previous.end) {
          previous.end = Math.max(previous.end, current.end);
        } else {
          merged.push(current);
        }
      }
      
      totalMs = merged.reduce((sum, interval) => sum + (interval.end - interval.start), 0);
    }
    
    const totalHours = totalMs / (1000 * 60 * 60);
    const hoursStr = Number.isInteger(totalHours) ? totalHours.toString() : totalHours.toFixed(1);
    
    rows.push([
      `"${pData.name.replace(/"/g, '""')}"`,
      `"${pData.email.replace(/"/g, '""')}"`,
      `"${hoursStr}"`
    ].join(","));
  }
  
  const csv = `\uFEFF${rows.join("\r\n")}`;
  
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${group.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_summary.csv"`,
    },
  });
}
