import { expect, test } from "@playwright/test";
import {
  authenticate,
  mockApi,
  TEST_USER,
} from "./support/app-fixture";

const firstCv = {
  realId: "cv-focused-1",
  indexId: 1,
  userIndexId: 1,
  name: "Frontend Engineer",
  email: TEST_USER.email,
  uploadDate: "2026-07-24T10:00:00.000Z",
  fileName: "frontend-engineer.pdf",
};
const secondCv = {
  ...firstCv,
  realId: "cv-focused-2",
  indexId: 2,
  userIndexId: 2,
  name: "Backend Engineer",
  email: "backend@example.com",
  fileName: "backend-engineer.pdf",
};

test.describe("CV management", () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test("shows a clear empty state", async ({ page }) => {
    await mockApi(page, { "GET /cv": { body: [] } });
    await page.goto("/admin/cvs");
    await expect(page.getByText("No CVs found")).toBeVisible({
      timeout: 30_000,
    });
  });

  test("redirects unauthenticated visitors away from CV details", async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.removeItem("token"));
    await mockApi(page);
    await page.goto(`/admin/cvs/${firstCv.fileName}`);

    await expect(page).toHaveURL("/", { timeout: 30_000 });
  });

  test("clears the session when access to another user's CV is forbidden", async ({
    page,
  }) => {
    await mockApi(page, {
      [`GET /cv/${firstCv.fileName}`]: {
        status: 403,
        body: { message: "Forbidden" },
      },
    });
    await page.goto(`/admin/cvs/${firstCv.fileName}`);

    await expect(page).toHaveURL("/", { timeout: 30_000 });
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("token")))
      .toBeNull();
  });

  test("shows a recoverable CV loading error", async ({ page }) => {
    await mockApi(page, {
      "GET /cv": { status: 503, body: { message: "Unavailable" } },
    });
    await page.goto("/admin/cvs");
    await expect(page.getByText("Failed to fetch CVs")).toBeVisible({
      timeout: 30_000,
    });
  });

  test("filters CV cards by candidate name and email", async ({ page }) => {
    await mockApi(page, { "GET /cv": { body: [firstCv, secondCv] } });
    await page.goto("/admin/cvs");
    await expect(page.getByText(firstCv.name)).toBeVisible({ timeout: 30_000 });
    await page.getByPlaceholder("Search by email or name...").fill("backend@");

    await expect(page.getByText(secondCv.name)).toBeVisible();
    await expect(page.getByText(firstCv.name)).not.toBeVisible();
  });

  test("rejects a non-PDF upload before sending it", async ({ page }) => {
    let uploadCalls = 0;
    await mockApi(page, {
      "POST /cv/upload": () => {
        uploadCalls += 1;
        return { status: 201, body: {} };
      },
    });
    await page.goto("/admin");
    await page.getByLabel("Add A Name or Note").fill("Invalid file");
    await page.locator("#dropzone-file").setInputFiles({
      name: "malware.exe",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("not a pdf"),
    });
    await page.getByRole("button", { name: "Upload CV" }).click();

    await expect(page.getByText("Only PDF files are accepted").first()).toBeVisible();
    expect(uploadCalls).toBe(0);
  });

  test("requires a title before uploading a PDF", async ({ page }) => {
    await mockApi(page);
    await page.goto("/admin");
    await page.locator("#dropzone-file").setInputFiles({
      name: "candidate.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n%%EOF"),
    });
    await page.getByRole("button", { name: "Upload CV" }).click();

    await expect(
      page.getByText("Please enter a name or note for the CV").first(),
    ).toBeVisible();
  });

  test("surfaces duplicate CV errors from the server", async ({ page }) => {
    await mockApi(page, {
      "POST /cv/upload": {
        status: 400,
        body: { message: "A CV with this title already exists" },
      },
    });
    await page.goto("/admin");
    await page.getByLabel("Add A Name or Note").fill(firstCv.name);
    await page.locator("#dropzone-file").setInputFiles({
      name: firstCv.fileName,
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n%%EOF"),
    });
    await page.getByRole("button", { name: "Upload CV" }).click();

    await expect(
      page.getByText("A CV with this title already exists").first(),
    ).toBeVisible();
  });

  test("renames a CV and keeps the new title visible", async ({ page }) => {
    let currentName = firstCv.name;
    await mockApi(page, {
      "GET /cv": () => ({
        body: [{ ...firstCv, name: currentName }],
      }),
      [`PATCH /cv/${firstCv.realId}`]: (request) => {
        currentName = (request.postDataJSON() as { name: string }).name;
        return { body: { ...firstCv, name: currentName } };
      },
    });
    await page.goto("/admin/cvs");
    await expect(page.getByText(firstCv.name)).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Edit CV title" }).click();
    await page.getByRole("textbox", { name: "CV title" }).fill("Lead Engineer");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Lead Engineer")).toBeVisible();
    expect(currentName).toBe("Lead Engineer");
  });

  test("keeps a CV visible when deletion fails", async ({ page }) => {
    await mockApi(page, {
      "GET /cv": { body: [firstCv] },
      [`DELETE /cv/${firstCv.realId}`]: {
        status: 500,
        body: { message: "Delete failed" },
      },
    });
    await page.goto("/admin/cvs");
    await expect(page.getByText(firstCv.name)).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText("Failed to delete CV").first()).toBeVisible();
    await expect(page.getByText(firstCv.name)).toBeVisible();
  });
});
