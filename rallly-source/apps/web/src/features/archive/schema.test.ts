import {
  archiveTableNames,
  INSTANCE_ARCHIVE_FORMAT,
  INSTANCE_ARCHIVE_VERSION,
  instanceArchiveSchema,
} from "./schema";

function createArchive() {
  const data = Object.fromEntries(
    archiveTableNames.map((table) => [table, []]),
  ) as unknown as Record<
    (typeof archiveTableNames)[number],
    Record<string, unknown>[]
  >;
  data.users = [
    {
      id: "admin-id",
      role: "admin",
      deletedAt: null,
    },
  ];

  return {
    format: INSTANCE_ARCHIVE_FORMAT,
    version: INSTANCE_ARCHIVE_VERSION,
    exportedAt: "2026-08-14T12:00:00.000Z",
    applicationVersion: "4.0.0",
    counts: Object.fromEntries(
      archiveTableNames.map((table) => [table, data[table].length]),
    ),
    data,
  };
}

describe("instanceArchiveSchema", () => {
  it("accepts a complete versioned archive", () => {
    expect(instanceArchiveSchema.safeParse(createArchive()).success).toBe(true);
  });

  it("rejects an archive with a missing table", () => {
    const archive = createArchive();
    Reflect.deleteProperty(archive.data, "polls");

    expect(instanceArchiveSchema.safeParse(archive).success).toBe(false);
  });

  it("rejects counts that do not match the table contents", () => {
    const archive = createArchive();
    archive.counts.polls = 1;

    const result = instanceArchiveSchema.safeParse(archive);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["counts", "polls"]);
    }
  });

  it("requires an active administrator so the restored instance is manageable", () => {
    const archive = createArchive();
    archive.data.users[0] = {
      id: "user-id",
      role: "user",
      deletedAt: null,
    };

    expect(instanceArchiveSchema.safeParse(archive).success).toBe(false);
  });

  it("rejects archive versions the importer does not understand", () => {
    const archive = { ...createArchive(), version: 2 };

    expect(instanceArchiveSchema.safeParse(archive).success).toBe(false);
  });
});
