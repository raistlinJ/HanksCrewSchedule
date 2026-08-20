export type UserResponseExportRow = {
  userId: string;
  userName: string;
  userEmail: string;
  pollGroup: string;
  pollId: string;
  pollTitle: string;
  pollStatus: string;
  responseKind?: string;
  optionStart: string;
  durationMinutes: number | "";
  optionMaxYes?: number | "";
  hasPrimaryYes?: string;
  auxiliarySelection?: string;
  auxiliaryMinYes?: number | "";
  auxiliaryMaxYesSelections?: number | "";
  auxiliaryOption?: string;
  auxiliaryOptionMaxYes?: number | "";
  response: string;
  note: string;
  responseUpdatedAt: string;
};

const columns = [
  "Row Type",
  "User Name",
  "User Email",
  "Poll Group",
  "Poll",
  "Poll Status",
  "Event Start (ISO)",
  "Event End (ISO)",
  "Event Hours",
  "Counted Hours (No Overlap)",
  "Person Total Hours",
] as const;

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function createUserHoursCsv(rows: UserResponseExportRow[]) {
  const datedRows = rows.filter(
    (row) => row.optionStart && !Number.isNaN(Date.parse(row.optionStart)),
  );
  const eventDates = datedRows
    .map((row) => row.optionStart.slice(0, 10))
    .sort();
  const dateRange = eventDates.length
    ? `${eventDates[0]} - ${eventDates[eventDates.length - 1]}`
    : "No yes responses";
  const title = [
    csvCell(`Hours Export (${dateRange})`),
    ...columns.slice(1).map(() => csvCell("")),
  ].join(",");
  const header = columns.map(csvCell).join(",");
  const body: string[] = [];
  const rowsByEmail = new Map<string, UserResponseExportRow[]>();

  for (const row of datedRows) {
    const email = row.userEmail.trim().toLowerCase();
    const emailRows = rowsByEmail.get(email) ?? [];
    emailRows.push(row);
    rowsByEmail.set(email, emailRows);
  }

  for (const [, emailRows] of Array.from(rowsByEmail.entries()).sort(
    ([emailA], [emailB]) => emailA.localeCompare(emailB),
  )) {
    emailRows.sort(
      (a, b) =>
        a.optionStart.localeCompare(b.optionStart) ||
        a.pollTitle.localeCompare(b.pollTitle),
    );

    const coveredIntervals: Array<{ start: number; end: number }> = [];
    let totalCountedMinutes = 0;

    for (const row of emailRows) {
      const start = Date.parse(row.optionStart);
      const durationMinutes =
        typeof row.durationMinutes === "number" ? row.durationMinutes : 0;
      const end = start + durationMinutes * 60_000;
      const previousCoveredMinutes = getCoveredMinutes(coveredIntervals);
      coveredIntervals.push({ start, end });
      const coveredMinutes = getCoveredMinutes(coveredIntervals);
      const countedMinutes = coveredMinutes - previousCoveredMinutes;
      totalCountedMinutes = coveredMinutes;

      body.push(
        [
          "Entry",
          row.userName,
          row.userEmail,
          row.pollGroup,
          row.pollTitle,
          row.pollStatus,
          row.optionStart,
          new Date(end).toISOString(),
          toHours(durationMinutes),
          toHours(countedMinutes),
          "",
        ]
          .map(csvCell)
          .join(","),
      );
    }

    const user = emailRows[0];
    if (!user) {
      continue;
    }
    body.push(
      [
        "Total",
        user.userName,
        user.userEmail,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        toHours(totalCountedMinutes),
      ]
        .map(csvCell)
        .join(","),
    );
  }

  return `\uFEFF${[title, header, ...body].join("\r\n")}`;
}

function getCoveredMinutes(intervals: Array<{ start: number; end: number }>) {
  const sortedIntervals = intervals
    .filter(({ start, end }) => end > start)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  let coveredMilliseconds = 0;
  let currentStart: number | null = null;
  let currentEnd: number | null = null;

  for (const interval of sortedIntervals) {
    if (currentStart === null || currentEnd === null) {
      currentStart = interval.start;
      currentEnd = interval.end;
    } else if (interval.start <= currentEnd) {
      currentEnd = Math.max(currentEnd, interval.end);
    } else {
      coveredMilliseconds += currentEnd - currentStart;
      currentStart = interval.start;
      currentEnd = interval.end;
    }
  }

  if (currentStart !== null && currentEnd !== null) {
    coveredMilliseconds += currentEnd - currentStart;
  }

  return coveredMilliseconds / 60_000;
}

function toHours(minutes: number) {
  return Number((minutes / 60).toFixed(6));
}

const responseColumns: Array<{
  label: string;
  value: (row: UserResponseExportRow) => string | number;
}> = [
  { label: "User ID", value: (row) => row.userId },
  { label: "User Name", value: (row) => row.userName },
  { label: "User Email", value: (row) => row.userEmail },
  { label: "Poll Group", value: (row) => row.pollGroup },
  { label: "Poll ID", value: (row) => row.pollId },
  { label: "Poll", value: (row) => row.pollTitle },
  { label: "Poll Status", value: (row) => row.pollStatus },
  { label: "Response Kind", value: (row) => row.responseKind ?? "pollOption" },
  { label: "Option Start (ISO)", value: (row) => row.optionStart },
  { label: "Duration (minutes)", value: (row) => row.durationMinutes },
  {
    label: "Option Yes Limit",
    value: (row) => row.optionMaxYes ?? "",
  },
  {
    label: "Has Primary Yes",
    value: (row) => row.hasPrimaryYes ?? "",
  },
  {
    label: "Auxiliary Selection",
    value: (row) => row.auxiliarySelection ?? "",
  },
  {
    label: "Auxiliary Minimum Yes",
    value: (row) => row.auxiliaryMinYes ?? "",
  },
  {
    label: "Auxiliary Maximum Selections Per Participant",
    value: (row) => row.auxiliaryMaxYesSelections ?? "",
  },
  { label: "Auxiliary Choice", value: (row) => row.auxiliaryOption ?? "" },
  {
    label: "Auxiliary Choice Yes Limit",
    value: (row) => row.auxiliaryOptionMaxYes ?? "",
  },
  { label: "Response", value: (row) => row.response },
  { label: "Note", value: (row) => row.note },
  {
    label: "Response Updated At (ISO)",
    value: (row) => row.responseUpdatedAt,
  },
];

export function createUserResponsesCsv(rows: UserResponseExportRow[]) {
  const header = responseColumns
    .map((column) => csvCell(column.label))
    .join(",");
  const body = rows.map((row) =>
    responseColumns.map((column) => csvCell(column.value(row))).join(","),
  );

  return `\uFEFF${[header, ...body].join("\r\n")}`;
}
