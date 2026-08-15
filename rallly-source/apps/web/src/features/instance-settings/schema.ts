import * as z from "zod";

export const instanceSettingsSchema = z.object({
  disableUserRegistration: z.boolean(),
  sendSupportEmails: z.boolean(),
});

export const updateInstanceSettingsSchema = instanceSettingsSchema.partial();

export type InstanceSettings = z.infer<typeof instanceSettingsSchema>;
