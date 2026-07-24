import { expect, test } from "@playwright/test";
import { openLogin } from "./support/app-fixture";

test("authentication shell renders and switches modes", async ({ page }) => {
  await openLogin(page);
  await expect(page.getByLabel("Email")).toBeVisible();
  await page
    .getByRole("button", { name: "Don't have an account? Sign up" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Create an account" }),
  ).toBeVisible();
});
