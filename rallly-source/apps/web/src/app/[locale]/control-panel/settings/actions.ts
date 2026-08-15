"use server";

import { prisma } from "@rallly/database";
import { updateTag } from "next/cache";
import { instanceSettingsTag } from "@/features/instance-settings/constants";
import { updateInstanceSettingsSchema } from "@/features/instance-settings/schema";
import { adminActionClient } from "@/lib/safe-action/server";

export const updateInstanceSettingsAction = adminActionClient
  .metadata({
    actionName: "update_instance_settings",
  })
  .inputSchema(updateInstanceSettingsSchema)
  .action(async ({ parsedInput }) => {
    await prisma.instanceSettings.update({
      where: {
        id: 1,
      },
      data: parsedInput,
    });

    updateTag(instanceSettingsTag);
  });
