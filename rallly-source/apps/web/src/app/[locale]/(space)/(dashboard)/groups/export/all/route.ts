import { NextResponse } from "next/server";
import { prisma } from "@rallly/database";
import { getTranslation } from "@/i18n/server";
import { getActiveSpace } from "@/features/space/loaders";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;
  const space = await getActiveSpace();

  const groups = await prisma.pollGroup.findMany({
    where: { spaceId: space.id },
    include: {
      polls: {
        where: { deleted: false },
        include: {
          options: {
            orderBy: { startTime: "asc" }
          },
          participants: {
            where: { deleted: false },
            include: { votes: true },
          },
        },
      },
    },
  });

  if (!groups || groups.length === 0) {
    return new NextResponse("No groups found", { status: 404 });
  }

  const { t } = await getTranslation(locale);
  
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

  // Collect ALL options across ALL polls to form the global columns
  const allOptions: { pollId: string; optionId: string; title: string; headerStr: string }[] = [];
  
  for (const group of groups) {
    for (const poll of group.polls) {
      for (const opt of poll.options) {
        allOptions.push({
          pollId: poll.id,
          optionId: opt.id,
          title: poll.title,
          headerStr: `${poll.title} - ${formatOption(poll, opt)}`
        });
      }
    }
  }

  // Aggregate participants by email or name
  // To keep track of their votes for each option, we'll store a map of optionId -> voteType
  const participantMap = new Map<string, { 
    name: string; 
    email: string; 
    notes: string[]; 
    votes: Map<string, string>; // optionId -> voteType
    intervals: any[] 
  }>();

  for (const group of groups) {
    for (const poll of group.polls) {
      if (poll.participants.length === 0) continue;

      for (const participant of poll.participants) {
        const key = participant.email ? participant.email.toLowerCase() : participant.name.toLowerCase();
        
        if (!participantMap.has(key)) {
          participantMap.set(key, {
            name: participant.name,
            email: participant.email || "",
            notes: [],
            votes: new Map(),
            intervals: []
          });
        }
        
        const pData = participantMap.get(key)!;
        
        if (participant.note) {
          pData.notes.push(participant.note);
        }
        
        // Record all their votes
        for (const vote of participant.votes) {
          pData.votes.set(vote.optionId, vote.type);
        }
        
        // Collect "yes" intervals for total hours
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
  }

  const rows: string[] = [];
  
  // Create Header Row
  const headerRow = [
    t("name", { defaultValue: "Name" }),
    t("email", { defaultValue: "Email" }),
    t("note", { defaultValue: "Note (Combined)" }),
    ...allOptions.map(o => `"${o.headerStr.replace(/"/g, '""')}"`),
    "Total Hours"
  ];
  rows.push(headerRow.join(","));

  for (const pData of Array.from(participantMap.values())) {
    let totalMs = 0;
    
    if (pData.intervals.length > 0) {
      pData.intervals.sort((a: any, b: any) => a.start - b.start);
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
      
      totalMs = merged.reduce((sum: number, interval: any) => sum + (interval.end - interval.start), 0);
    }
    
    const totalHours = totalMs / (1000 * 60 * 60);
    const hoursStr = Number.isInteger(totalHours) ? totalHours.toString() : totalHours.toFixed(1);
    
    const combinedNotes = Array.from(new Set(pData.notes)).join(" | ");

    const row = [
      `"${pData.name.replace(/"/g, '""')}"`,
      `"${pData.email.replace(/"/g, '""')}"`,
      `"${combinedNotes.replace(/"/g, '""')}"`,
    ];

    // Fill in vote for every option globally
    for (const o of allOptions) {
      const voteType = pData.votes.get(o.optionId);
      if (voteType === "yes") {
        row.push(t("yes"));
      } else if (voteType === "ifNeedBe") {
        row.push(t("ifNeedBe"));
      } else if (voteType === "no") {
        row.push(t("no"));
      } else {
        row.push(""); // Did not participate/vote for this option
      }
    }

    row.push(`"${hoursStr}"`);
    rows.push(row.join(","));
  }
  
  const csv = `\uFEFF${rows.join("\r\n")}`;
  
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="all_groups_summary.csv"`,
    },
  });
}
