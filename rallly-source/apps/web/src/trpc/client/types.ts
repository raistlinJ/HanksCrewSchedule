import type { PollStatus, VoteType } from "@rallly/database";

export type GetPollApiResponse = {
  id: string;
  title: string;
  location: string | null;
  description: string | null;
  options: { id: string; startTime: Date; duration: number }[];
  user: {
    id: string;
    name: string;
    image: string | null;
    banned: boolean;
  } | null;
  timeZone: string | null;
  canManage: boolean;
  groupNavigation: {
    groupId: string;
    groupTitle: string;
    position: number;
    total: number;
    previous: { id: string; title: string } | null;
    next: { id: string; title: string } | null;
  } | null;
  status: PollStatus;
  createdAt: Date;
  deleted: boolean;
  event: {
    id: string;
    start: Date;
    duration: number;
    attendees: Array<{ name: string; email: string; status: string }>;
    status: string;
  } | null;
};

export type Vote = {
  optionId: string;
  type: VoteType;
};
