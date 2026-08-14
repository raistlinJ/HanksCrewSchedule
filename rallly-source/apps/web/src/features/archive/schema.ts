import * as z from "zod";

export const INSTANCE_ARCHIVE_FORMAT = "rallly-instance-archive";
export const INSTANCE_ARCHIVE_VERSION = 1;

export const archiveTableNames = [
  "users",
  "accounts",
  "notificationPreferences",
  "spaces",
  "spaceMembers",
  "spaceMemberInvites",
  "pollGroups",
  "eventTypes",
  "sheets",
  "sheetSlots",
  "scheduledEvents",
  "rescheduledEventDates",
  "scheduledEventInvites",
  "polls",
  "options",
  "participants",
  "votes",
  "comments",
  "pollInvites",
  "pollActivities",
] as const;

export type ArchiveTableName = (typeof archiveTableNames)[number];

const archiveRecordSchema = z.record(z.string(), z.unknown());

const archiveDataShape = Object.fromEntries(
  archiveTableNames.map((table) => [table, z.array(archiveRecordSchema)]),
) as Record<ArchiveTableName, z.ZodArray<typeof archiveRecordSchema>>;

export const instanceArchiveSchema = z
  .object({
    format: z.literal(INSTANCE_ARCHIVE_FORMAT),
    version: z.literal(INSTANCE_ARCHIVE_VERSION),
    exportedAt: z.iso.datetime(),
    applicationVersion: z.string(),
    counts: z.record(z.enum(archiveTableNames), z.number().int().nonnegative()),
    data: z.object(archiveDataShape).strict(),
  })
  .strict()
  .superRefine((archive, ctx) => {
    for (const table of archiveTableNames) {
      if (archive.counts[table] !== archive.data[table].length) {
        ctx.addIssue({
          code: "custom",
          path: ["counts", table],
          message: `Count does not match data.${table}`,
        });
      }
    }

    const hasAdmin = archive.data.users.some(
      (user) => user.role === "admin" && user.deletedAt == null,
    );
    if (!hasAdmin) {
      ctx.addIssue({
        code: "custom",
        path: ["data", "users"],
        message: "An archive must contain at least one active administrator",
      });
    }
  });

export type InstanceArchive = z.infer<typeof instanceArchiveSchema>;
