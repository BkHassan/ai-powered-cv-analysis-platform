import { expect, test, type Page } from "@playwright/test";
import { mockApi } from "./support/app-fixture";

const QUIZ_ID = "focused-quiz";
const QUIZ_TOKEN = "focused-token";
const questions = [
  {
    id: "q1",
    text: "Which keyword declares a constant?",
    options: ["var", "const", "function"],
    correct: 1,
  },
  {
    id: "q2",
    text: "Which status means Not Found?",
    options: ["200", "404", "500"],
    correct: 1,
  },
];

async function mockQuiz(
  page: Page,
  options: {
    loadStatus?: number;
    loadBody?: unknown;
    submitStatus?: number;
    submitBody?: unknown;
  } = {},
) {
  await mockApi(page, {
    [`GET /quiz/${QUIZ_ID}`]: {
      status: options.loadStatus,
      body:
        options.loadBody ??
        ({ questions, timeLimit: 300 } satisfies Record<string, unknown>),
    },
    [`POST /quiz/${QUIZ_ID}/submit`]: {
      status: options.submitStatus,
      body: options.submitBody ?? { score: 100 },
    },
  });
}

async function openQuiz(page: Page) {
  await page.goto(`/quiz/${QUIZ_ID}?token=${QUIZ_TOKEN}`);
}

async function startQuiz(page: Page) {
  await openQuiz(page);
  await expect(page.getByRole("heading", { name: "Quiz Rules" })).toBeVisible({
    timeout: 30_000,
  });
  await page
    .getByRole("checkbox", {
      name: "I have read and agree to the rules above.",
    })
    .check();
  await page.getByRole("button", { name: "Start Quiz" }).click();
  await expect(page.getByText("Technical Quiz", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
}

test.describe("Candidate quiz", () => {
  test("rejects a quiz link with no token", async ({ page }) => {
    await mockApi(page);
    await page.goto(`/quiz/${QUIZ_ID}`);

    await expect(page.getByText("Invalid quiz link")).toBeVisible({
      timeout: 30_000,
    });
  });

  test("shows a server error when quiz loading fails", async ({ page }) => {
    await mockQuiz(page, {
      loadStatus: 410,
      loadBody: { message: "Quiz link has expired" },
    });
    await openQuiz(page);

    await expect(page.getByText("Quiz link has expired")).toBeVisible({
      timeout: 30_000,
    });
  });

  test("requires accepting rules before the quiz starts", async ({ page }) => {
    await mockQuiz(page);
    await openQuiz(page);

    const start = page.getByRole("button", { name: "Start Quiz" });
    await expect(start).toBeDisabled({ timeout: 30_000 });
    await page
      .getByRole("checkbox", {
        name: "I have read and agree to the rules above.",
      })
      .check();
    await expect(start).toBeEnabled();
  });

  test("does not submit until every question is answered", async ({ page }) => {
    await mockQuiz(page);
    await startQuiz(page);
    await page.getByLabel("const").check();
    await page.getByRole("button", { name: "Submit Quiz" }).click();

    await expect(page.getByText("Please answer all questions").first()).toBeVisible();
    await expect(page.getByText("Technical Quiz", { exact: true })).toBeVisible();
  });

  test("keeps answers visible when submission fails", async ({ page }) => {
    await mockQuiz(page, {
      submitStatus: 503,
      submitBody: { message: "Submission service unavailable" },
    });
    await startQuiz(page);
    await page.getByLabel("const").check();
    await page.getByLabel("404").check();
    await page.getByRole("button", { name: "Submit Quiz" }).click();

    await expect(
      page.getByText("Submission service unavailable").first(),
    ).toBeVisible();
    await expect(page.getByLabel("const")).toBeChecked();
    await expect(page.getByLabel("404")).toBeChecked();
  });

  test("submits a complete quiz exactly once", async ({ page }) => {
    let submitCalls = 0;
    await mockApi(page, {
      [`GET /quiz/${QUIZ_ID}`]: {
        body: { questions, timeLimit: 300 },
      },
      [`POST /quiz/${QUIZ_ID}/submit`]: () => {
        submitCalls += 1;
        return { body: { score: 100 } };
      },
    });
    await startQuiz(page);
    await page.getByLabel("const").check();
    await page.getByLabel("404").check();
    await page.getByRole("button", { name: "Submit Quiz" }).click();

    await expect(
      page.getByText("Thank you for completing the quiz!"),
    ).toBeVisible();
    expect(submitCalls).toBe(1);
  });
});
