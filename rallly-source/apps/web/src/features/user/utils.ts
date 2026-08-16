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
