import { expect, test, type Page, type Route } from "@playwright/test";

const API_URL = "http://localhost:3003";
const USER_EMAIL = `qa.user.${Date.now()}@example.com`;
const USER_PASSWORD = "InitialPass1!";
const NEW_PASSWORD = "ResetPass2!";
const ADMIN_EMAIL = "admin@app.com";
const ADMIN_PASSWORD = "AdminPass1!";
const SIGNUP_OTP = "246810";
const RESET_OTP = "135790";
const CV_FILE_NAME = "qa-valid-cv.pdf";
const INITIAL_CV_TITLE = "QA Stress Candidate";
const EDITED_CV_TITLE = "QA Stress Candidate — Edited";
const QUIZ_ID = "quiz-e2e-001";
const QUIZ_TOKEN = "quiz-token-e2e";

type Tier = "Free" | "Premium";

interface MockState {
  password: string;
  verified: boolean;
  tier: Tier;
  userExists: boolean;
  cv: null | {
    realId: string;
    indexId: number;
    userIndexId: number;
    name: string;
    email: string;
    uploadDate: string;
    fileName: string;
  };
  quizScore: number | null;
}

const quizQuestions = [
  {
    id: "q1",
    text: "Which keyword declares a block-scoped constant?",
    options: ["var", "let", "const", "static"],
    correct: 2,
  },
  {
    id: "q2",
    text: "Which HTTP status means Not Found?",
    options: ["200", "201", "404", "500"],
    correct: 2,
  },
  {
    id: "q3",
    text: "Which Playwright locator is accessibility-first?",
    options: ["getByRole", "querySelector", "xpath", "getElementById"],
    correct: 0,
  },
];

function jwt(email: string, role: "user" | "admin", tier: Tier = "Free") {
  const encode = (value: object) =>
    // The application currently decodes tokens with window.atob(), so keep
    // standard base64 padding instead of emitting unpadded base64url.
    Buffer.from(JSON.stringify(value)).toString("base64");

  return `${encode({ alg: "none", typ: "JWT" })}.${encode({
    sub: `${role}-e2e`,
    email,
    role,
    tier,
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  })}.e2e-signature`;
}

async function json(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function installStatefulApiMocks(page: Page, state: MockState) {
  await page.route(`${API_URL}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { pathname } = url;

    if (pathname === "/auth/signup" && request.method() === "POST") {
      state.userExists = true;
      state.password = USER_PASSWORD;
      return json(route, 201, {
        accessToken: jwt(USER_EMAIL, "user", state.tier),
      });
    }

    if (pathname === "/auth/verify-otp" && request.method() === "POST") {
      const body = request.postDataJSON() as { otp: string };
      if (body.otp !== SIGNUP_OTP) {
        return json(route, 400, { message: "Invalid OTP" });
      }
      state.verified = true;
      return json(route, 200, {});
    }

    if (pathname === "/auth/forgot-password" && request.method() === "POST") {
      return json(route, 200, {});
    }

    if (pathname === "/auth/reset-password" && request.method() === "POST") {
      const body = request.postDataJSON() as {
        otp: string;
        newPassword: string;
      };
      if (body.otp !== RESET_OTP) {
        return json(route, 400, { message: "invalid OTP" });
      }
      state.password = body.newPassword;
      return json(route, 200, {});
    }

    if (pathname === "/auth/login" && request.method() === "POST") {
      const body = request.postDataJSON() as {
        email: string;
        password: string;
      };
      if (body.email === ADMIN_EMAIL && body.password === ADMIN_PASSWORD) {
        return json(route, 200, {
          accessToken: jwt(ADMIN_EMAIL, "admin", "Premium"),
        });
      }
      if (
        body.email === USER_EMAIL &&
        body.password === state.password &&
        state.userExists &&
        state.verified
      ) {
        return json(route, 200, {
          accessToken: jwt(USER_EMAIL, "user", state.tier),
        });
      }
      return json(route, 401, { message: "Incorrect password" });
    }

    if (pathname === "/auth/users" && request.method() === "GET") {
      return json(
        route,
        200,
        state.userExists
          ? [
              {
                id: "user-e2e",
                name: "QA Stress User",
                email: USER_EMAIL,
                role: "user",
                tier: state.tier,
                isEmailVerified: true,
                cv_id: state.cv ? [state.cv.realId] : [],
                createdDate: new Date().toISOString(),
              },
            ]
          : [],
      );
    }

    // Product contract for the requested tier feature. The current app does
    // not call this endpoint yet; the UI assertions below make that gap visible.
    if (pathname === "/auth/update-tier" && request.method() === "PATCH") {
      const body = request.postDataJSON() as { tier: Tier };
      state.tier = body.tier;
      return json(route, 200, { email: USER_EMAIL, tier: state.tier });
    }

    if (pathname === "/auth/delete" && request.method() === "DELETE") {
      state.userExists = false;
      return json(route, 200, {});
    }

    if (pathname === "/cv" && request.method() === "GET") {
      return json(route, 200, state.cv ? [state.cv] : []);
    }

    if (pathname === "/cv/upload" && request.method() === "POST") {
      state.cv = {
        realId: "cv-e2e-001",
        indexId: 1,
        userIndexId: 1,
        name: INITIAL_CV_TITLE,
        email: USER_EMAIL,
        uploadDate: new Date().toISOString(),
        fileName: CV_FILE_NAME,
      };
      return json(route, 201, {
        fileName: CV_FILE_NAME,
        id: state.cv.realId,
      });
    }

    // Product contract for title editing. This is intentionally mocked now;
    // the soft UI assertion reports that the edit control is not implemented.
    if (
      pathname === `/cv/${state.cv?.realId ?? "missing"}` &&
      request.method() === "PATCH"
    ) {
      const body = request.postDataJSON() as { name: string };
      if (state.cv) state.cv.name = body.name;
      return json(route, 200, state.cv);
    }

    if (pathname.startsWith("/cv/") && request.method() === "DELETE") {
      state.cv = null;
      return json(route, 200, { message: "CV deleted successfully" });
    }

    if (pathname === "/quiz/generate" && request.method() === "POST") {
      if (!state.cv) {
        return json(route, 400, {
          message: "Upload a CV before starting a quiz",
        });
      }
      return json(route, 201, {
        quizId: QUIZ_ID,
        link: `http://localhost:3000/quiz/${QUIZ_ID}?token=${QUIZ_TOKEN}`,
        candidateEmail: USER_EMAIL,
        questions: quizQuestions,
      });
    }

    if (pathname === `/quiz/${QUIZ_ID}` && request.method() === "GET") {
      return json(route, 200, {
        questions: quizQuestions,
        timeLimit: 300,
      });
    }

    if (
      pathname === `/quiz/${QUIZ_ID}/submit` &&
      request.method() === "POST"
    ) {
      const body = request.postDataJSON() as {
        answers: Record<string, number>;
      };
      const correct = quizQuestions.filter(
        (question) => body.answers[question.id] === question.correct,
      ).length;
      state.quizScore = Math.round((correct / quizQuestions.length) * 100);
      return json(route, 200, {
        score: state.quizScore,
        correct,
        total: quizQuestions.length,
      });
    }

    if (
      pathname === `/quiz/${QUIZ_ID}/results` &&
      request.method() === "GET"
    ) {
      return json(route, 200, {
        fileName: CV_FILE_NAME,
        score: state.quizScore,
        timeTaken: 42,
        completedAt: new Date().toISOString(),
      });
    }

    if (
      pathname === `/quiz/cv/${encodeURIComponent(CV_FILE_NAME)}` &&
      request.method() === "GET"
    ) {
      return json(route, 200, { quizId: QUIZ_ID });
    }

    if (pathname.endsWith("/attempts") && request.method() === "GET") {
      return json(route, 200, []);
    }

    // Chat/history requests are incidental to dashboard navigation.
    if (pathname.includes("chat-history")) return json(route, 200, []);
    if (pathname.startsWith("/quiz/")) return json(route, 200, []);

    return json(route, 404, { message: `Unhandled E2E route: ${pathname}` });
  });
}

async function fillOtp(page: Page, otp: string) {
  const inputs = page.locator('input[inputmode="numeric"], input[maxlength="1"]');
  await expect(inputs).toHaveCount(6);
  for (const [index, digit] of [...otp].entries()) {
    await inputs.nth(index).fill(digit);
  }
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await page.waitForTimeout(250);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await expect(async () => {
    const loginResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/auth/login" &&
        response.request().method() === "POST",
      { timeout: 3_000 },
    );
    await page.getByRole("button", { name: "Log in" }).click();
    expect((await loginResponse).status()).toBe(200);
  }).toPass({ timeout: 20_000 });
  await expect(page).toHaveURL(/\/admin$/, { timeout: 60_000 });
  await expect(
    page.getByRole("heading", { name: "Powering Your Hiring Process" }),
  ).toBeVisible({ timeout: 30_000 });
}

async function logout(page: Page) {
  await page.getByText("Logout", { exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("token")), {
      timeout: 30_000,
    })
    .toBeNull();
  await expect(page).toHaveURL("/", { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await page.waitForTimeout(250);
}

test.describe("Flawless multi-role, high-stress application flow", () => {
  test("signup, recovery, CV quiz, admin intervention, and cleanup", async ({
    page,
  }) => {
    // First-time Next.js route compilation on Windows can be slow.
    test.setTimeout(600_000);

    const state: MockState = {
      password: USER_PASSWORD,
      verified: false,
      tier: "Free",
      userExists: false,
      cv: null,
      quizScore: null,
    };
    await installStatefulApiMocks(page, state);

    await test.step('1. The "Forgetful User" Flow', async () => {
      await page.goto("/");
      await page
        .getByRole("button", { name: "Don't have an account? Sign up" })
        .click();

      await page.getByLabel("First name").fill("QA");
      await page.getByLabel("Last name").fill("Stress User");
      const emailInput = page.getByLabel("Email");
      await emailInput.fill("invalid-email");
      await page.getByLabel("Password").fill(USER_PASSWORD);
      await page.getByRole("checkbox").check();
      await page.getByRole("button", { name: "Sign up" }).click();

      await expect
        .poll(() => emailInput.evaluate((input) => !input.checkValidity()))
        .toBe(true);
      await expect
        .poll(() => emailInput.evaluate((input) => input.validationMessage))
        .not.toBe("");

      await emailInput.fill(USER_EMAIL);
      await page.getByRole("button", { name: "Sign up" }).click();
      await expect(page.getByText("Enter OTP")).toBeVisible();

      await fillOtp(page, "000000");
      await page.getByRole("button", { name: "Verify OTP" }).click();
      await expect(page.getByText("Invalid OTP").first()).toBeVisible();

      await fillOtp(page, SIGNUP_OTP);
      await page.getByRole("button", { name: "Verify OTP" }).click();
      await expect(page).toHaveURL(/fromSignup=true/, { timeout: 8_000 });

      await login(page, USER_EMAIL, USER_PASSWORD);
      await logout(page);

      await expect(async () => {
        await page.getByRole("button", { name: "Forgot password?" }).click();
        await expect(
          page.getByRole("button", { name: "Back to Login" }),
        ).toBeVisible({ timeout: 2_000 });
      }).toPass({ timeout: 15_000 });
      await page.getByLabel("Email").fill(USER_EMAIL);
      await page.getByRole("button", { name: "Send Reset OTP" }).click();
      await expect(page.getByText("Reset OTP", { exact: true })).toBeVisible();
      await fillOtp(page, RESET_OTP);
      await page.getByLabel("New Password").fill(NEW_PASSWORD);
      await page.getByRole("button", { name: "Reset Password" }).click();
      await expect(page).toHaveURL(/fromReset=true/, { timeout: 8_000 });

      await login(page, USER_EMAIL, NEW_PASSWORD);
    });

    await test.step("2. CV Stress & Quiz Flow", async () => {
      await page.goto("/admin/quiz/missing-cv");
      const blockedQuizResponse = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === "/quiz/generate" &&
          response.request().method() === "POST",
      );
      await page.getByRole("button", { name: "Generate Quiz" }).click();
      expect((await blockedQuizResponse).status()).toBe(400);
      await expect(
        page.getByText("Upload a CV before starting a quiz").first(),
      ).toBeVisible();

      await page.goto("/admin");
      await page.getByLabel("Add A Name or Note").fill(INITIAL_CV_TITLE);
      await page.locator("#dropzone-file").setInputFiles({
        name: "corrupted-executable.exe",
        mimeType: "application/octet-stream",
        buffer: Buffer.alloc(2 * 1024 * 1024, 0xff),
      });
      await page.getByRole("button", { name: "Upload CV" }).click();
      await expect(page.getByText("Only PDF files are accepted").first()).toBeVisible();

      await page.locator("#dropzone-file").setInputFiles({
        name: CV_FILE_NAME,
        mimeType: "application/pdf",
        buffer: Buffer.from(
          "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
        ),
      });
      await page.getByRole("button", { name: "Upload CV" }).click();
      await expect(page).toHaveURL(
        new RegExp(`/admin/chat.*${CV_FILE_NAME}`),
        { timeout: 30_000 },
      );

      await page.goto("/admin/cvs");
      await expect(page.getByText(INITIAL_CV_TITLE)).toBeVisible();
      const editTitleButton = page.getByRole("button", {
        name: /edit (cv )?title/i,
      });
      await expect
        .soft(
          editTitleButton,
          "Missing product feature: CV cards need an accessible Edit title control and PATCH endpoint",
        )
        .toBeVisible();
      if (await editTitleButton.isVisible().catch(() => false)) {
        await editTitleButton.click();
        const titleInput = page.getByRole("textbox", { name: "CV title" });
        await titleInput.fill(EDITED_CV_TITLE);
        await page.getByRole("button", { name: /save/i }).click();
        await expect(page.getByText(EDITED_CV_TITLE)).toBeVisible();
      }

      await page.goto(`/admin/quiz/${CV_FILE_NAME}`);
      await page.getByRole("button", { name: "Generate Quiz" }).click();
      await expect(page.getByText("Generated Questions")).toBeVisible();

      await page.goto(`/quiz/${QUIZ_ID}?token=${QUIZ_TOKEN}`);
      await page.getByRole("checkbox").check();
      await page.getByRole("button", { name: "Start Quiz" }).click();
      await page.getByLabel("const").check();
      await page.getByLabel("404").check();
      await page.getByLabel("xpath").check(); // intentionally wrong: 2/3
      await page.getByRole("button", { name: "Submit Quiz" }).click();
      await expect(
        page.getByText("Thank you for completing the quiz!"),
      ).toBeVisible();

      expect(state.quizScore).toBe(67);
      await page.goto("/admin/cvs");
      await expect(
        page.getByText(`${state.quizScore}%`, { exact: true }),
      ).toBeVisible();
    });

    await test.step('3. The "Admin Intervention" Flow', async () => {
      await logout(page);
      await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      await page.goto("/admin/users");

      const userSearch = page.getByPlaceholder(/search.*user/i);
      await expect
        .soft(
          userSearch,
          "Missing product feature: Admin User Management needs a user search input",
        )
        .toBeVisible();
      if (await userSearch.isVisible().catch(() => false)) {
        await userSearch.fill(USER_EMAIL);
      }
      await expect(page.getByText(USER_EMAIL)).toBeVisible();

      const premiumButton = page.getByRole("button", {
        name: /upgrade.*premium|make premium/i,
      });
      await expect
        .soft(
          premiumButton,
          "Missing product feature: users currently have roles only; add Free/Premium tier management",
        )
        .toBeVisible();
      if (await premiumButton.isVisible().catch(() => false)) {
        await premiumButton.click();
        state.tier = "Premium";
      }

      await logout(page);
      await login(page, USER_EMAIL, NEW_PASSWORD);
      await expect
        .soft(
          page.getByText("Premium", { exact: true }),
          "Missing product feature: the normal-user UI does not display account tier",
        )
        .toBeVisible();
    });

    await test.step("4. Destructive Cleanup Flow", async () => {
      await logout(page);
      await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      await page.goto("/admin/users");

      const downgradeButton = page.getByRole("button", {
        name: /downgrade.*free|make free/i,
      });
      await expect
        .soft(
          downgradeButton,
          "Missing product feature: Admin User Management needs a downgrade-to-Free action",
        )
        .toBeVisible();
      if (await downgradeButton.isVisible().catch(() => false)) {
        await downgradeButton.click();
        state.tier = "Free";
      }

      await page.goto("/admin/cvs");
      const cvCard = page
        .getByText(INITIAL_CV_TITLE)
        .or(page.getByText(EDITED_CV_TITLE))
        .locator("xpath=ancestor::*[.//button[normalize-space()='Delete']][1]");
      await expect(cvCard).toBeVisible();
      await cvCard.getByRole("button", { name: "Delete" }).click();
      await expect(page.getByText("CV deleted successfully").first()).toBeVisible();
      await expect(page.getByText("No CVs found")).toBeVisible();

      await page.goto("/admin/users");
      page.once("dialog", (dialog) => dialog.accept());
      await page
        .getByRole("button", { name: `Delete user ${USER_EMAIL}` })
        .click();
      await expect(
        page.getByRole("row").filter({ hasText: USER_EMAIL }),
      ).toHaveCount(0);
      expect(state.userExists).toBe(false);
      expect(state.cv).toBeNull();
    });
  });
});
