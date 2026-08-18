import { describe, expect, it } from "vitest";
import {
  canAccessParticipantByEmail,
  getEffectivePollEmailSettings,
  normalizePollAccessEmail,
  shouldRequirePollEmailGate,
} from "./utils";

describe("standalone poll email access", () => {
  it("normalizes whitespace and casing", () => {
    expect(normalizePollAccessEmail("  Person@Example.COM ")).toBe(
      "person@example.com",
    );
  });

  it("requires the gate only when verification is disabled and no edit link is valid", () => {
    expect(
      shouldRequirePollEmailGate({
        requireEmailVerification: false,
        impersonatedUserId: null,
      }),
    ).toBe(true);
    expect(
      shouldRequirePollEmailGate({
        requireEmailVerification: false,
        impersonatedUserId: "guest-user",
      }),
    ).toBe(false);
    expect(
      shouldRequirePollEmailGate({
        requireEmailVerification: true,
        impersonatedUserId: null,
      }),
    ).toBe(false);
  });

  it("allows a matching email only when verification is disabled", () => {
    expect(
      canAccessParticipantByEmail({
        requireEmailVerification: false,
        participantEmail: "person@example.com",
        accessEmail: "Person@Example.com",
      }),
    ).toBe(true);
    expect(
      canAccessParticipantByEmail({
        requireEmailVerification: true,
        participantEmail: "person@example.com",
        accessEmail: "person@example.com",
      }),
    ).toBe(false);
    expect(
      canAccessParticipantByEmail({
        requireEmailVerification: false,
        participantEmail: "other@example.com",
        accessEmail: "person@example.com",
      }),
    ).toBe(false);
  });

  it.each([
    true,
    false,
  ])("makes a group's %s setting authoritative for child polls", (groupRequireEmailVerification) => {
    expect(
      getEffectivePollEmailSettings({
        groupRequireEmailVerification,
        requireParticipantEmail: !groupRequireEmailVerification,
        requireEmailVerification: !groupRequireEmailVerification,
      }),
    ).toEqual({
      requireParticipantEmail: groupRequireEmailVerification,
      requireEmailVerification: groupRequireEmailVerification,
    });
  });

  it("keeps standalone poll settings independent", () => {
    expect(
      getEffectivePollEmailSettings({
        groupRequireEmailVerification: null,
        requireParticipantEmail: true,
        requireEmailVerification: false,
      }),
    ).toEqual({
      requireParticipantEmail: true,
      requireEmailVerification: false,
    });
  });
});
