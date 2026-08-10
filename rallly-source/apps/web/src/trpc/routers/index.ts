import "@/lib/dayjs";

import { mergeRouters, router } from "../trpc";
import { auth } from "./auth";
import { billing } from "./billing";
import { calendars } from "./calendars";
import { eventTypes } from "./event-types";
import { events } from "./events";
import { polls } from "./polls";
import { pollGroups } from "./poll-groups";
import { spaces } from "./spaces";

export const appRouter = mergeRouters(
  router({
    auth,
    billing,
    eventTypes,
    events,
    polls,
    pollGroups,
    spaces,
    calendars,
  }),
);

export type AppRouter = typeof appRouter;
