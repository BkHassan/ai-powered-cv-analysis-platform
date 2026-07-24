import { expect, test } from "@playwright/test";
import {
  authenticate,
  mockApi,
  TEST_USER,
} from "./support/app-fixture";

const managedUser = {
  id: "managed-user",
  name: "Managed Candidate",
  email: TEST_USER.email,
  role: "user" as const,
  tier: "Free" as const,
  isEmailVerified: true,
  cv_id: [],
  createdDate: "2026-07-24T10:00:00.000Z",
};

test.describe("Admin user management", () => {
  test("redirects a normal user away from user management", async ({ page }) => {
    await authenticate(page, "user");
    await mockApi(page);
    await page.goto("/admin/users");

    await expect(page).toHaveURL(/\/admin$/, { timeout: 30_000 });
  });

  test("shows an empty state when there are no users", async ({ page }) => {
    await authenticate(page, "admin", "Premium");
    await mockApi(page, { "GET /auth/users": { body: [] } });
    await page.goto("/admin/users");

    await expect(page.getByText("No users found")).toBeVisible({
      timeout: 30_000,
    });
  });

  test("searches users by name and email", async ({ page }) => {
    await authenticate(page, "admin", "Premium");
    await mockApi(page, {
      "GET /auth/users": {
        body: [
          managedUser,
          {
            ...managedUser,
            id: "other-user",
            name: "Another Person",
            email: "another@example.com",
          },
        ],
      },
    });
    await page.goto("/admin/users");
    await expect(page.getByText(managedUser.email)).toBeVisible({
      timeout: 30_000,
    });
    await page
      .getByPlaceholder("Search users by name or email...")
      .fill("managed");

    await expect(page.getByText(managedUser.email)).toBeVisible();
    await expect(page.getByText("another@example.com")).not.toBeVisible();
  });

  test("promotes a user to admin", async ({ page }) => {
    let requestedRole = "";
    await authenticate(page, "admin", "Premium");
    await mockApi(page, {
      "GET /auth/users": { body: [managedUser] },
      "PATCH /auth/update-role": (request) => {
        requestedRole = (request.postDataJSON() as { role: string }).role;
        return { body: {} };
      },
    });
    await page.goto("/admin/users");
    await page.getByRole("button", { name: "Make Admin" }).click();

    await expect(page.getByRole("button", { name: "Remove Admin" })).toBeVisible();
    expect(requestedRole).toBe("admin");
  });

  test("upgrades and downgrades an account tier", async ({ page }) => {
    const requestedTiers: string[] = [];
    await authenticate(page, "admin", "Premium");
    await mockApi(page, {
      "GET /auth/users": { body: [managedUser] },
      "PATCH /auth/update-tier": (request) => {
        requestedTiers.push(
          (request.postDataJSON() as { tier: string }).tier,
        );
        return { body: {} };
      },
    });
    await page.goto("/admin/users");
    await page.getByRole("button", { name: "Make Premium" }).click();
    await expect(page.getByText("Premium", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Make Free" }).click();

    await expect(page.getByText("Free", { exact: true })).toBeVisible();
    expect(requestedTiers).toEqual(["Premium", "Free"]);
  });

  test("does not delete a user when confirmation is cancelled", async ({
    page,
  }) => {
    let deleteCalls = 0;
    await authenticate(page, "admin", "Premium");
    await mockApi(page, {
      "GET /auth/users": { body: [managedUser] },
      "DELETE /auth/delete": () => {
        deleteCalls += 1;
        return { body: {} };
      },
    });
    await page.goto("/admin/users");
    await expect(page.getByText(managedUser.email)).toBeVisible({
      timeout: 30_000,
    });
    page.once("dialog", (dialog) => dialog.dismiss());
    await page
      .getByRole("button", { name: `Delete user ${managedUser.email}` })
      .click();

    await expect(page.getByText(managedUser.email)).toBeVisible();
    expect(deleteCalls).toBe(0);
  });

  test("removes a user after confirmation", async ({ page }) => {
    await authenticate(page, "admin", "Premium");
    await mockApi(page, {
      "GET /auth/users": { body: [managedUser] },
      "DELETE /auth/delete": { body: {} },
    });
    await page.goto("/admin/users");
    await expect(page.getByText(managedUser.email)).toBeVisible({
      timeout: 30_000,
    });
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: `Delete user ${managedUser.email}` })
      .click();

    await expect(
      page.getByRole("row").filter({ hasText: managedUser.email }),
    ).toHaveCount(0);
  });
});
