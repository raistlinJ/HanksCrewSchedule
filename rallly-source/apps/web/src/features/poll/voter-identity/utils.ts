import * as z from "zod";

const voterIdentitySchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email(),
});

export function isVoterIdentityComplete(identity: {
  name: string;
  email: string;
}) {
  return voterIdentitySchema.safeParse(identity).success;
}
