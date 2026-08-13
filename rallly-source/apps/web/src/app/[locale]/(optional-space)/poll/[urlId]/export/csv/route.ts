import { NextResponse } from "next/server";
import { prisma } from "@rallly/database";
import { getSession } from "@/lib/auth";
import { getTranslation } from "@/i18n/server";
import { hasPollAdminAccess } from "@/features/poll/data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ urlId: string; locale: string }> }
) {
  const { urlId, locale } = await params;
  const session = await getSession();

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const hasAccess = await hasPollAdminAccess(urlId, session.user.id);
  
  if (!hasAccess) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const poll = await prisma.poll.findUnique({
    where: { id: urlId },
    include: {
      options: {
        orderBy: { startTime: "asc" },
      },
      participants: {
        where: { deleted: false },
        include: { votes: true },
      },
    },
  });

  if (!poll) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Need translation function to get "Yes", "No", "If Need Be"
  const { t } = await getTranslation(locale);
  
  // Format dates
  const formatOption = (poll: any, opt: any) => {
    const d = new Date(opt.startTime);
    const timeZone = poll.timeZone || 'UTC';
    const dateStr = new Intl.DateTimeFormat(locale, { 
      weekday: 'short', month: 'short', day: 'numeric', timeZone
    }).format(d);

    if (poll.kind === "time" || opt.duration > 0) {
      const timeFormatter = new Intl.DateTimeFormat(locale, {
        hour: 'numeric', minute: '2-digit', timeZone
      });
      const startStr = timeFormatter.format(d);
      
      if (opt.duration > 0) {
        const endDate = new Date(d.getTime() + opt.duration * 60000);
        const endStr = timeFormatter.format(endDate);
        const hours = opt.duration / 60;
        const hoursStr = Number.isInteger(hours) ? hours.toString() : hours.toFixed(1);
        return `${dateStr} (${startStr} - ${endStr}, ${hoursStr}h)`;
      }
      
      return `${dateStr} (${startStr})`;
    }
    
    return dateStr;
  };

  const calculateTotalHours = (poll: any, participant: any) => {
    const yesOptions = poll.options.filter((opt: any) => {
      const vote = participant.votes.find((v: any) => v.optionId === opt.id);
      return vote?.type === "yes";
    });

    if (yesOptions.length === 0) return 0;

    const intervals = yesOptions.map((opt: any) => {
      const start = new Date(opt.startTime).getTime();
      const duration = opt.duration || 0;
      return { start, end: start + (duration * 60 * 1000) };
    }).sort((a: any, b: any) => a.start - b.start);

    const merged = [intervals[0]];
    for (let i = 1; i < intervals.length; i++) {
      const current = intervals[i];
      const previous = merged[merged.length - 1];

      if (current.start <= previous.end) {
        previous.end = Math.max(previous.end, current.end);
      } else {
        merged.push(current);
      }
    }

    const totalMs = merged.reduce((sum: number, interval: any) => sum + (interval.end - interval.start), 0);
    return totalMs / (1000 * 60 * 60);
  };

  const rows: string[] = [];
  
  // Header for the poll matrix
  const header = [
    t("name", { defaultValue: "Name" }),
    t("email", { defaultValue: "Email" }),
    t("note", { defaultValue: "Note" }),
    t("submittedAt", { defaultValue: "Submitted At" }),
    ...poll.options.map((opt: any) => `"${formatOption(poll, opt).replace(/"/g, '""')}"`),
    "Total Hours"
  ].join(",");
  rows.push(header);
  
  // Rows for each participant
  for (const participant of poll.participants) {
    const totalHours = calculateTotalHours(poll, participant);
    const hoursStr = Number.isInteger(totalHours) ? totalHours.toString() : totalHours.toFixed(1);

    const createdAtStr = participant.createdAt ? new Date(participant.createdAt).toLocaleString(locale) : "";
    
    const row = [
      `"${participant.name.replace(/"/g, '""')}"`,
      `"${(participant.email || "").replace(/"/g, '""')}"`,
      `"${(participant.note || "").replace(/"/g, '""')}"`,
      `"${createdAtStr}"`,
      ...poll.options.map((opt: any) => {
        const vote = participant.votes.find((v: any) => v.optionId === opt.id);
        const voteType = vote?.type || "no";
        if (voteType === "yes") return t("yes");
        if (voteType === "ifNeedBe") return t("ifNeedBe");
        return t("no");
      }),
      `"${hoursStr}"`
    ].join(",");
    rows.push(row);
  }
  
  const csv = `\uFEFF${rows.join("\r\n")}`; // Include BOM for Excel UTF-8 support
  
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${poll.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_responses.csv"`,
    },
  });
}
