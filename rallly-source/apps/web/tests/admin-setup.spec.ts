import { expect, test } from "@playwright/test";
import { prisma } from "@rallly/database";
import { deleteAllMessages } from "@rallly/test-helpers";
import { createUserInDb, loginWithEmail } from "./test-utils";

const INITIAL_ADMIN_TEST_EMAIL = "initial.admin@rallly.co";
const REGULAR_USER_EMAIL = "user@example.com";
const SUBSEQUENT_ADMIN_EMAIL = "admin2@example.com";
const OTHER_USER_EMAIL = "other.user@example.com";

test.describe("Admin Setup Page Access", () => {
  test.beforeEach(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            INITIAL_ADMIN_TEST_EMAIL,
            REGULAR_USER_EMAIL,
            SUBSEQUENT_ADMIN_EMAIL,
            OTHER_USER_EMAIL,
          ],
        },
      },
    });

    await deleteAllMessages();
  });

  test("should redirect unauthenticated user to login page", async ({
    page,
  }) => {
    await page.goto("/admin-setup");
    await expect(page).toHaveURL(/.*\/login/);
  });

  test("should automatically promote the designated initial admin", async ({
    page,
  }) => {
    await createUserInDb({
      email: INITIAL_ADMIN_TEST_EMAIL,
      name: "Initial Admin User",
      role: "user",
    });
    await loginWithEmail(page, { email: INITIAL_ADMIN_TEST_EMAIL });

    await page.goto("/control-panel");
    await expect(page).toHaveURL("/control-panel");
    await expect(
      page.getByRole("heading", { name: "Home", level: 1 }),
    ).toBeVisible();

    const user = await prisma.user.findUnique({
      where: { email: INITIAL_ADMIN_TEST_EMAIL },
    });
    expect(user?.role).toBe("admin");
  });

  test("should explain missing admin access to a regular user (not initial admin, not admin role)", async ({
    page,
  }) => {
    await createUserInDb({
      email: REGULAR_USER_EMAIL,
      name: "Regular User",
      role: "user",
    });
    await loginWithEmail(page, { email: REGULAR_USER_EMAIL });

    await page.goto("/admin-setup");
    await expect(page.getByText("Administrator access required")).toBeVisible();
    await expect(page.getByText(REGULAR_USER_EMAIL)).toBeVisible();
  });

  test("should redirect an existing admin user to control-panel", async ({
    page,
  }) => {
    await createUserInDb({
      email: SUBSEQUENT_ADMIN_EMAIL,
      name: "Existing Admin",
      role: "admin",
    });
    await loginWithEmail(page, { email: SUBSEQUENT_ADMIN_EMAIL });

    await page.goto("/admin-setup");
    await expect(page).toHaveURL("/control-panel");
  });

  test("should explain missing admin access if INITIAL_ADMIN_EMAIL in env is different from user's email", async ({
    page,
  }) => {
    await createUserInDb({
      email: OTHER_USER_EMAIL,
      name: "Other User",
      role: "user",
    });
    await loginWithEmail(page, { email: OTHER_USER_EMAIL });

    await page.goto("/admin-setup");
    await expect(page.getByText("Administrator access required")).toBeVisible();
  });
});
