import type { PollStatus, VoteType } from "@rallly/database";

export type GetPollApiResponse = {
  id: string;
  title: string;
  location: string | null;
  description: string | null;
  options: {
    id: string;
    startTime: Date;
    duration: number;
    maxYes: number | null;
  }[];
  auxiliarySelection: {
    id: string;
    name: string;
    minYes: number;
    maxYesSelections: number | null;
    options: {
      id: string;
      label: string;
      maxYes: number | null;
      position: number;
    }[];
  } | null;
  user: {
    id: string;
    name: string;
    image: string | null;
    banned: boolean;
  } | null;
  timeZone: string | null;
  hideScores: boolean;
  hideParticipants: boolean;
  disableComments: boolean;
  requireParticipantEmail: boolean;
  requireEmailVerification: boolean;
  publicResults: boolean;
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
