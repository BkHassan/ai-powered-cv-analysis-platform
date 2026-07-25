import { expect, test } from "@playwright/test";
import { fillOtp, fillSignup, openLogin, openSignup } from "./support/app-fixture";

/**
 * End-to-end authentication against the deployed frontend and backend.
 * Nothing is mocked: every assertion exercises Vercel -> Render -> ChromaDB ->
 * Gemini for real. Run with:
 *   PLAYWRIGHT_BASE_URL=<vercel url> npx playwright test --project=deployed
 */

const API_URL =
  process.env.DEPLOYED_API_URL ?? "https://craftmind-backend.onrender.com";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Free hosting tiers stop idle services, so the first call pays a cold start
// that is far slower than any warm request.
const COLD_START_MS = 240_000;
const REMOTE_ACTION_MS = 120_000;

function uniqueEmail() {
  return `e2e.${Date.now()}.${Math.floor(Math.random() * 10_000)}@example.com`;
}

async function signUpFresh(page: import("@playwright/test").Page, email: string) {
  await openSignup(page);
  await fillSignup(page, { email });
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByText("Enter OTP")).toBeVisible({
    timeout: REMOTE_ACTION_MS,
  });
}

test.describe("Deployed authentication", () => {
  test.beforeAll(async ({ playwright }) => {
    // Wake the backend once up front; otherwise the login form's own 60s abort
    // fires before a cold Render instance ever answers.
    const api = await playwright.request.newContext();
    const health = await api.get(`${API_URL}/health`, {
      timeout: COLD_START_MS,
    });
    expect(
      health.ok(),
      `backend health check failed with ${health.status()}`,
    ).toBeTruthy();
    await api.dispose();
  });

  test("backend is healthy and allows the deployed origin through CORS", async ({
    playwright,
    baseURL,
  }) => {
    const api = await playwright.request.newContext();

    const health = await api.get(`${API_URL}/health`, { timeout: COLD_START_MS });
    expect(health.status()).toBe(200);
    expect(await health.json()).toMatchObject({ status: "ok" });

    const preflight = await api.fetch(`${API_URL}/auth/login`, {
      method: "OPTIONS",
      headers: {
        origin: baseURL!,
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type",
      },
      timeout: REMOTE_ACTION_MS,
    });
    expect(preflight.status()).toBeLessThan(400);
    expect(preflight.headers()["access-control-allow-origin"]).toBeTruthy();

    await api.dispose();
  });

  test("signup endpoint can write to the vector store", async ({ playwright }) => {
    const api = await playwright.request.newContext();
    const response = await api.post(`${API_URL}/auth/signup`, {
      data: {
        firstName: "Deployed",
        lastName: "Probe",
        email: uniqueEmail(),
        password: "DeployedPass1!",
      },
      timeout: COLD_START_MS,
    });

    // A 503 here means embeddings are unavailable (usually a missing
    // GEMINI_API_KEY), which is the failure that silently broke signup before.
    expect(
      response.status(),
      `signup returned ${response.status()}: ${await response.text()}`,
    ).toBeLessThan(400);
    await api.dispose();
  });

  test("login page renders on the deployed frontend", async ({ page }) => {
    await openLogin(page);
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Log in" })).toBeEnabled();
  });

  test("malformed email never leaves the browser", async ({ page }) => {
    let loginCalls = 0;
    page.on("request", (request) => {
      if (request.url().includes("/auth/login")) loginCalls += 1;
    });

    await openLogin(page);
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("Whatever1!");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page.getByText("Please enter a valid email address").first())
      .toBeVisible();
    expect(loginCalls).toBe(0);
  });

  test("unknown account offers signup instead of a 404 page", async ({ page }) => {
    await openLogin(page);
    await page.getByLabel("Email").fill(uniqueEmail());
    await page.getByLabel("Password").fill("NoSuchPass1!");
    await page.getByRole("button", { name: "Log in" }).click();

    // Regression guard: this used to redirect to a nonexistent /signup route.
    await expect(
      page.getByRole("heading", { name: "Create an account" }),
    ).toBeVisible({ timeout: REMOTE_ACTION_MS });
    await expect(page.getByText("This page could not be found")).toHaveCount(0);
    expect(new URL(page.url()).pathname).toBe("/");
  });

  test("signup creates an account and asks for the OTP", async ({ page }) => {
    await signUpFresh(page, uniqueEmail());
  });

  test("rejects a weak signup password before any request", async ({ page }) => {
    let signupCalls = 0;
    page.on("request", (request) => {
      if (request.url().includes("/auth/signup")) signupCalls += 1;
    });

    await openSignup(page);
    await fillSignup(page, { email: uniqueEmail(), password: "weak" });
    await page.getByRole("button", { name: "Sign up" }).click();

    await expect(
      page.getByText("Password must meet all requirements").first(),
    ).toBeVisible();
    expect(signupCalls).toBe(0);
  });

  test("refuses a duplicate email", async ({ page }) => {
    const email = uniqueEmail();
    await signUpFresh(page, email);

    await page.goto("/");
    await openSignup(page);
    await fillSignup(page, { email });
    await page.getByRole("button", { name: "Sign up" }).click();

    await expect(page.getByText(/already exists/i).first()).toBeVisible({
      timeout: REMOTE_ACTION_MS,
    });
  });

  test("keeps an unverified account locked out of login", async ({ page }) => {
    const email = uniqueEmail();
    await signUpFresh(page, email);

    await openLogin(page);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("FocusedPass1!");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(
      page.getByText("Please verify your email with the OTP sent to your inbox.")
        .first(),
    ).toBeVisible({ timeout: REMOTE_ACTION_MS });
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("token")))
      .toBeNull();
  });

  test("stays on the OTP step after a wrong code", async ({ page }) => {
    await signUpFresh(page, uniqueEmail());
    await fillOtp(page, "000000");
    await page.getByRole("button", { name: "Verify OTP" }).click();

    await expect(page.getByRole("button", { name: "Verify OTP" })).toBeVisible({
      timeout: REMOTE_ACTION_MS,
    });
  });

  test("rejects a wrong password on a real account", async ({ page }) => {
    test.skip(
      !ADMIN_EMAIL || !ADMIN_PASSWORD,
      "ADMIN_EMAIL and ADMIN_PASSWORD are required",
    );

    await openLogin(page);
    await page.getByLabel("Email").fill(ADMIN_EMAIL!);
    await page.getByLabel("Password").fill("DefinitelyWrong1!");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(
      page.getByText("Incorrect password. Please try again.").first(),
    ).toBeVisible({ timeout: REMOTE_ACTION_MS });
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("token")))
      .toBeNull();
  });

  test("admin signs in and reaches the dashboard", async ({ page }) => {
    test.skip(
      !ADMIN_EMAIL || !ADMIN_PASSWORD,
      "ADMIN_EMAIL and ADMIN_PASSWORD are required",
    );

    await openLogin(page);
    await page.getByLabel("Email").fill(ADMIN_EMAIL!);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD!);
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/admin$/, { timeout: REMOTE_ACTION_MS });
    const token = await page.evaluate(() => localStorage.getItem("token"));
    expect(token).toBeTruthy();
    expect(JSON.parse(atob(token!.split(".")[1])).role).toBe("admin");
  });

  test("sends an anonymous visitor away from the dashboard", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/$/, { timeout: REMOTE_ACTION_MS });
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
  });

  test("reports an unknown email during password recovery", async ({ page }) => {
    await openLogin(page);
    await page.getByRole("button", { name: "Forgot password?" }).click();
    await page.getByLabel("Email").fill(uniqueEmail());
    await page.getByRole("button", { name: "Send Reset OTP" }).click();

    await expect(page.getByText(/not found/i).first()).toBeVisible({
      timeout: REMOTE_ACTION_MS,
    });
  });
});
