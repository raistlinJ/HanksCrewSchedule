import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { prisma } from "@rallly/database";
import { getSpaceInviteLink } from "@rallly/test-helpers";
import { RegisterPage } from "./register-page";
import {
  createUserInDb,
  loginWithEmail,
  upgradeSpaceToPro,
} from "./test-utils";

const runId = Date.now().toString(36);
const createdUserIds: string[] = [];

/**
 * Creates a user whose personal space is upgraded to pro with the given
 * number of seats.
 */
async function createSpaceAdmin({
  name,
  seats,
}: {
  name: string;
  seats: number;
}) {
  const email = `${name.toLowerCase().replace(/\s/g, "-")}-${runId}@example.com`;
  const user = await createUserInDb({ email, name });
  createdUserIds.push(user.id);

  const space = await prisma.space.findFirstOrThrow({
    where: { ownerId: user.id },
  });
  await upgradeSpaceToPro({ spaceId: space.id, userId: user.id, seats });

  return { user, space, email };
}

async function createMemberInDb({
  spaceId,
  name,
}: {
  spaceId: string;
  name: string;
}) {
  const email = `${name.toLowerCase().replace(/\s/g, "-")}-${runId}@example.com`;
  const user = await createUserInDb({ email, name });
  createdUserIds.push(user.id);

  await prisma.spaceMember.create({
    data: {
      spaceId,
      userId: user.id,
      role: "MEMBER",
    },
  });

  return { user, email };
}

function memberRow(page: Page, text: string) {
  return page.getByRole("listitem").filter({ hasText: text });
}

// After a page load, React briefly keeps a second hidden copy of the
// streamed page content in a staging <div hidden> under <body>. Text
// locators strict-fail against it, so page text assertions scope to
// #main-content, which only ever holds the live copy.
function mainContent(page: Page) {
  return page.locator("#main-content");
}

async function gotoMembersSettings(page: Page, email: string) {
  await loginWithEmail(page, { email });
  await page.goto("/settings/members");
  await page.getByRole("heading", { name: "Members" }).waitFor();
}

test.afterAll(async () => {
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds } },
    });
    createdUserIds.length = 0;
  }
});

test.describe("Space members", () => {
  test("admin can invite a member who joins via the emailed link", async ({
    page,
    browser,
  }) => {
    // Two OTP logins plus email roundtrips don't fit the default timeout
    // against a dev server.
    test.setTimeout(90_000);

    const owner = await createSpaceAdmin({ name: "Invite Owner", seats: 3 });
    const inviteeEmail = `invitee-${runId}@example.com`;

    await gotoMembersSettings(page, owner.email);
    await expect(
      mainContent(page).getByText("1 of 3 seats used"),
    ).toBeVisible();

    await page.getByRole("button", { name: "Invite member" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Email").fill(inviteeEmail);
    await dialog.getByRole("button", { name: "Send invite" }).click();

    await expect(page.getByText("Invitation sent")).toBeVisible();
    await expect(memberRow(page, inviteeEmail)).toBeVisible();
    await expect(
      memberRow(page, inviteeEmail).getByText(`Invited by ${owner.user.name}`),
    ).toBeVisible();

    // Capture the invite email before triggering the invitee's login so
    // the OTP capture doesn't pick it up instead.
    const inviteLink = await getSpaceInviteLink(inviteeEmail);

    const invitee = await createUserInDb({
      email: inviteeEmail,
      name: "Invited Member",
    });
    createdUserIds.push(invitee.id);

    const inviteeContext = await browser.newContext();
    const inviteePage = await inviteeContext.newPage();
    await loginWithEmail(inviteePage, { email: inviteeEmail });
    await inviteePage.goto(inviteLink);
    await inviteePage.getByRole("button", { name: "Accept invite" }).click();
    await expect(
      inviteePage.getByText("Successfully joined the space!"),
    ).toBeVisible();
    await inviteeContext.close();

    await page.reload();
    await expect(memberRow(page, "Invited Member")).toBeVisible();
    await expect(
      memberRow(page, inviteeEmail).getByText(`Invited by ${owner.user.name}`),
    ).toBeHidden();
    await expect(
      mainContent(page).getByText("2 of 3 seats used"),
    ).toBeVisible();
  });

  test("admin can override acceptance for an existing account", async ({
    page,
    browser,
  }) => {
    test.setTimeout(90_000);

    const owner = await createSpaceAdmin({ name: "Override Owner", seats: 3 });
    const memberEmail = `override-member-${runId}@example.com`;
    const member = await createUserInDb({
      email: memberEmail,
      name: "Override Member",
    });
    createdUserIds.push(member.id);

    await gotoMembersSettings(page, owner.email);
    await page.getByRole("button", { name: "Invite member" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Email").fill(memberEmail);
    await dialog.getByRole("button", { name: "Override accept" }).click();

    await expect(
      page.getByText(
        "Access granted. They will see this space when they log in.",
      ),
    ).toBeVisible();
    await expect(memberRow(page, "Override Member")).toBeVisible();

    await expect(
      prisma.spaceMember.findUnique({
        where: {
          spaceId_userId: {
            spaceId: owner.space.id,
            userId: member.id,
          },
        },
      }),
    ).resolves.not.toBeNull();
    await expect(
      prisma.spaceMemberInvite.count({
        where: { spaceId: owner.space.id, email: memberEmail },
      }),
    ).resolves.toBe(0);

    const memberContext = await browser.newContext();
    const memberPage = await memberContext.newPage();
    try {
      await loginWithEmail(memberPage, { email: memberEmail });
      await expect(memberPage.getByText(owner.space.name)).toBeVisible();
    } finally {
      await memberContext.close();
    }
  });

  test("override acceptance is claimed by a brand-new account on login", async ({
    page,
    browser,
  }) => {
    test.setTimeout(90_000);

    const owner = await createSpaceAdmin({
      name: "New Override Owner",
      seats: 3,
    });
    const memberEmail = `new-override-member-${runId}@example.com`;

    await gotoMembersSettings(page, owner.email);
    await page.getByRole("button", { name: "Invite member" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Email").fill(memberEmail);
    await dialog.getByRole("button", { name: "Override accept" }).click();

    await expect(
      prisma.spaceMemberInvite.findFirst({
        where: { spaceId: owner.space.id, email: memberEmail },
        select: { autoAccept: true },
      }),
    ).resolves.toEqual({ autoAccept: true });
    await expect(
      memberRow(page, memberEmail).getByText(
        "Will join automatically on login",
      ),
    ).toBeVisible();

    const memberContext = await browser.newContext();
    const memberPage = await memberContext.newPage();
    try {
      const registerPage = new RegisterPage(memberPage);
      await registerPage.goto();
      await registerPage.register({
        name: "New Override Member",
        email: memberEmail,
        verifyProfile: false,
        expectsProfileOnlySetup: true,
      });

      await expect(memberPage).toHaveURL("/");
      await expect(memberPage.getByText(owner.space.name)).toBeVisible();

      const member = await prisma.user.findUniqueOrThrow({
        where: { email: memberEmail },
        include: { spaces: true, memberOf: true },
      });
      expect(member.spaces).toHaveLength(0);
      expect(member.memberOf).toHaveLength(1);
      expect(member.memberOf[0]?.spaceId).toBe(owner.space.id);
    } finally {
      await memberContext.close();
      await prisma.user.deleteMany({ where: { email: memberEmail } });
    }
  });

  test("brand-new invitee returns to the invite after registration", async ({
    page,
    browser,
  }) => {
    test.setTimeout(90_000);

    const owner = await createSpaceAdmin({
      name: "New Invitee Owner",
      seats: 3,
    });
    const inviteeEmail = `new-invitee-${runId}@example.com`;

    await gotoMembersSettings(page, owner.email);
    await page.getByRole("button", { name: "Invite member" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Email").fill(inviteeEmail);
    await dialog.getByRole("button", { name: "Send invite" }).click();
    await expect(memberRow(page, inviteeEmail)).toBeVisible();

    const inviteLink = await getSpaceInviteLink(inviteeEmail);
    const inviteeContext = await browser.newContext();
    const inviteePage = await inviteeContext.newPage();

    try {
      await inviteePage.goto(inviteLink);
      await expect(inviteePage).toHaveURL(/\/login\?redirectTo=/);

      const registerPage = new RegisterPage(inviteePage);
      await registerPage.register({
        name: "Brand New Invitee",
        email: inviteeEmail,
        verifyProfile: false,
        expectsProfileOnlySetup: true,
      });

      const inviteeBeforeAccept = await prisma.user.findUniqueOrThrow({
        where: { email: inviteeEmail },
        select: {
          _count: {
            select: {
              spaces: true,
              memberOf: true,
            },
          },
        },
      });
      expect(inviteeBeforeAccept._count.spaces).toBe(0);
      expect(inviteeBeforeAccept._count.memberOf).toBe(0);

      await expect(
        inviteePage.getByRole("button", { name: "Accept invite" }),
      ).toBeVisible();
      await inviteePage.getByRole("button", { name: "Accept invite" }).click();

      await expect(inviteePage).toHaveURL("/");
      await expect(inviteePage.getByText(owner.space.name)).toBeVisible();

      const invitee = await prisma.user.findUniqueOrThrow({
        where: { email: inviteeEmail },
        include: {
          spaces: true,
          memberOf: true,
        },
      });
      const membership = await prisma.spaceMember.findUnique({
        where: {
          spaceId_userId: {
            spaceId: owner.space.id,
            userId: invitee.id,
          },
        },
      });
      expect(membership).not.toBeNull();
      expect(invitee.spaces).toHaveLength(0);
      expect(invitee.memberOf).toHaveLength(1);
      expect(invitee.memberOf[0]?.spaceId).toBe(owner.space.id);
    } finally {
      await inviteeContext.close();
      await prisma.user.deleteMany({ where: { email: inviteeEmail } });
    }
  });

  test("admin can cancel a pending invite", async ({ page }) => {
    const owner = await createSpaceAdmin({ name: "Cancel Owner", seats: 3 });
    const inviteeEmail = `cancel-invitee-${runId}@example.com`;

    await prisma.spaceMemberInvite.create({
      data: {
        spaceId: owner.space.id,
        email: inviteeEmail,
        role: "MEMBER",
        inviterId: owner.user.id,
      },
    });

    await gotoMembersSettings(page, owner.email);

    const inviteRow = memberRow(page, inviteeEmail);
    await expect(inviteRow).toBeVisible();
    await inviteRow.getByRole("button", { name: "More options" }).click();
    await page.getByRole("menuitem", { name: "Cancel invite" }).click();
    await page.getByRole("button", { name: "Confirm" }).click();

    await expect(page.getByText("Invite canceled successfully")).toBeVisible();
    await expect(inviteRow).toBeHidden();
  });

  test("admin can change a member's role", async ({ page }) => {
    const owner = await createSpaceAdmin({ name: "Role Owner", seats: 3 });
    const member = await createMemberInDb({
      spaceId: owner.space.id,
      name: "Role Member",
    });

    await gotoMembersSettings(page, owner.email);

    const row = memberRow(page, member.email);
    await expect(row.getByText("Member", { exact: true })).toBeVisible();
    await row.getByRole("button", { name: "More options" }).click();
    await page.getByRole("menuitem", { name: "Make admin" }).click();

    await expect(page.getByText("Role changed successfully")).toBeVisible();
    await expect(row.getByText("Admin", { exact: true })).toBeVisible();
  });

  test("admin can remove a member", async ({ page }) => {
    const owner = await createSpaceAdmin({ name: "Remove Owner", seats: 3 });
    const member = await createMemberInDb({
      spaceId: owner.space.id,
      name: "Removable Member",
    });

    await gotoMembersSettings(page, owner.email);
    await expect(
      mainContent(page).getByText("2 of 3 seats used"),
    ).toBeVisible();

    const row = memberRow(page, member.email);
    await row.getByRole("button", { name: "More options" }).click();
    await page.getByRole("menuitem", { name: "Remove member" }).click();
    await page.getByRole("button", { name: "Confirm" }).click();

    await expect(page.getByText("Member removed successfully")).toBeVisible();
    await expect(row).toBeHidden();

    await expect(
      mainContent(page).getByText("1 of 3 seats used"),
    ).toBeVisible();
  });

  test("invite button is disabled when all seats are used", async ({
    page,
  }) => {
    const owner = await createSpaceAdmin({ name: "Full Owner", seats: 1 });

    await gotoMembersSettings(page, owner.email);

    await expect(
      mainContent(page).getByText("1 of 1 seats used"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Invite member" }),
    ).toBeDisabled();
    await expect(
      mainContent(page).getByText(
        "Increase the number of seats in this space from the billing page.",
      ),
    ).toBeVisible();
  });
});
