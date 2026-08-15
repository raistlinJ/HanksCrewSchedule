export type UserResponseExportRow = {
  userId: string;
  userName: string;
  userEmail: string;
  pollGroup: string;
  pollId: string;
  pollTitle: string;
  pollStatus: string;
  optionStart: string;
  durationMinutes: number | "";
  response: string;
  note: string;
  responseUpdatedAt: string;
};

const columns: Array<{
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
  { label: "Option Start (ISO)", value: (row) => row.optionStart },
  { label: "Duration (minutes)", value: (row) => row.durationMinutes },
  { label: "Response", value: (row) => row.response },
  { label: "Note", value: (row) => row.note },
  {
    label: "Response Updated At (ISO)",
    value: (row) => row.responseUpdatedAt,
  },
];

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function createUserResponsesCsv(rows: UserResponseExportRow[]) {
  const header = columns.map((column) => csvCell(column.label)).join(",");
  const body = rows.map((row) =>
    columns.map((column) => csvCell(column.value(row))).join(","),
  );

  return `\uFEFF${[header, ...body].join("\r\n")}`;
}
