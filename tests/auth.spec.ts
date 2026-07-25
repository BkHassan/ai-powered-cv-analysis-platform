import { expect, test } from "@playwright/test";
import {
  fillOtp,
  fillSignup,
  jwt,
  mockApi,
  openLogin,
  openSignup,
  TEST_USER,
} from "./support/app-fixture";

test.describe("Authentication", () => {
  test("rejects malformed login email without calling the API", async ({
    page,
  }) => {
    let loginCalls = 0;
    await mockApi(page, {
      "POST /auth/login": () => {
        loginCalls += 1;
        return { body: {} };
      },
    });
    await openLogin(page);

    const email = page.getByLabel("Email");
    await email.fill("not-an-email");
    await page.getByLabel("Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: "Log in" }).click();

    await expect.poll(() => email.evaluate((node) => node.checkValidity())).toBe(
      false,
    );
    expect(loginCalls).toBe(0);
  });

  test("shows an error and keeps the session empty for bad credentials", async ({
    page,
  }) => {
    await mockApi(page, {
      "POST /auth/login": {
        status: 401,
        body: { message: "Incorrect password" },
      },
    });
    await openLogin(page);
    await page.getByLabel("Email").fill(TEST_USER.email);
    await page.getByLabel("Password").fill("WrongPass1!");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page.getByText("Incorrect password. Please try again.").first()).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("token")))
      .toBeNull();
  });

  test("stores a token and opens the dashboard after login", async ({ page }) => {
    const token = jwt(TEST_USER.email, "user");
    await mockApi(page, {
      "POST /auth/login": { body: { accessToken: token } },
    });
    await openLogin(page);
    await page.getByLabel("Email").fill(TEST_USER.email);
    await page.getByLabel("Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/admin$/, { timeout: 30_000 });
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("token")))
      .toBe(token);
  });

  test("offers the signup form when the account does not exist", async ({
    page,
  }) => {
    await mockApi(page, {
      "POST /auth/login": {
        status: 401,
        body: { message: "User not found" },
      },
    });
    await openLogin(page);
    await page.getByLabel("Email").fill("missing@example.com");
    await page.getByLabel("Password").fill(TEST_USER.password);
    await page.getByRole("button", { name: "Log in" }).click();

    // Redirecting to /signup used to land on the Next.js 404 page, since login
    // and signup are both served from "/".
    await expect(
      page.getByRole("heading", { name: "Create an account" }),
    ).toBeVisible();
    await expect(page.getByText("This page could not be found")).toHaveCount(0);
    expect(new URL(page.url()).pathname).toBe("/");
  });

  test("rejects a signup password that misses requirements", async ({
    page,
  }) => {
    await mockApi(page);
    await openSignup(page);
    await fillSignup(page, { password: "weak" });
    await page.getByRole("button", { name: "Sign up" }).click();

    await expect(
      page.getByText("Password must meet all requirements").first(),
    ).toBeVisible();
  });

  test("surfaces a duplicate-account response from signup", async ({ page }) => {
    await mockApi(page, {
      "POST /auth/signup": {
        status: 409,
        body: { message: "User with this email already exists" },
      },
    });
    await openSignup(page);
    await fillSignup(page);
    await page.getByRole("button", { name: "Sign up" }).click();

    await expect(
      page.getByText("User with this email already exists").first(),
    ).toBeVisible();
  });

  test("keeps OTP verification open after an invalid code", async ({ page }) => {
    await mockApi(page, {
      "POST /auth/signup": {
        status: 201,
        body: { accessToken: jwt(TEST_USER.email) },
      },
      "POST /auth/verify-otp": {
        status: 400,
        body: { message: "Invalid OTP" },
      },
    });
    await openSignup(page);
    await fillSignup(page);
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(page.getByText("Enter OTP")).toBeVisible();
    await fillOtp(page, "000000");
    await page.getByRole("button", { name: "Verify OTP" }).click();

    await expect(page.getByText("Invalid OTP").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Verify OTP" })).toBeVisible();
  });

  test("reports an unknown email during password recovery", async ({ page }) => {
    await mockApi(page, {
      "POST /auth/forgot-password": {
        status: 404,
        body: { message: "User not found" },
      },
    });
    await openLogin(page);
    await page.getByRole("button", { name: "Forgot password?" }).click();
    await expect(page.getByRole("button", { name: "Back to Login" })).toBeVisible();
    await page.getByLabel("Email").fill("missing@example.com");
    await page.getByRole("button", { name: "Send Reset OTP" }).click();

    await expect(page.getByText("User not found").first()).toBeVisible();
  });

  test("reports an expired reset OTP", async ({ page }) => {
    await mockApi(page, {
      "POST /auth/forgot-password": { body: {} },
      "POST /auth/reset-password": {
        status: 400,
        body: { message: "OTP expired" },
      },
    });
    await openLogin(page);
    await page.getByRole("button", { name: "Forgot password?" }).click();
    await page.getByLabel("Email").fill(TEST_USER.email);
    await page.getByRole("button", { name: "Send Reset OTP" }).click();
    await fillOtp(page, "123456");
    await page.getByLabel("New Password").fill("NewStrong2!");
    await page.getByRole("button", { name: "Reset Password" }).click();

    await expect(
      page.getByText("OTP has expired. Please request a new one.").first(),
    ).toBeVisible();
  });
});
