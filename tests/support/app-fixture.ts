import {
  expect,
  type Page,
  type Request,
  type Route,
} from "@playwright/test";

export const API_URL = "http://localhost:3003";
export const TEST_USER = {
  email: "focused.user@example.com",
  password: "FocusedPass1!",
};
export const TEST_ADMIN = {
  email: "focused.admin@example.com",
  password: "AdminPass1!",
};

export type Role = "user" | "admin";
export type Tier = "Free" | "Premium";
export type MockReply = {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
};
export type MockHandler =
  | MockReply
  | ((request: Request) => MockReply | Promise<MockReply>);
export type MockHandlers = Record<string, MockHandler>;

export function jwt(
  email: string,
  role: Role = "user",
  tier: Tier = "Free",
) {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({
    sub: `${role}-focused-test`,
    email,
    role,
    tier,
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.test-signature`;
}

async function fulfill(route: Route, reply: MockReply) {
  await route.fulfill({
    status: reply.status ?? 200,
    contentType: "application/json",
    headers: reply.headers,
    body: JSON.stringify(reply.body ?? {}),
  });
}

export async function mockApi(page: Page, handlers: MockHandlers = {}) {
  await page.route(`${API_URL}/**`, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const key = `${request.method()} ${pathname}`;
    const handler = handlers[key];

    if (handler) {
      const reply =
        typeof handler === "function" ? await handler(request) : handler;
      return fulfill(route, reply);
    }

    if (request.method() === "GET" && pathname === "/cv") {
      return fulfill(route, { body: [] });
    }
    if (
      request.method() === "GET" &&
      (pathname.includes("chat-history") || pathname.endsWith("/attempts"))
    ) {
      return fulfill(route, { body: [] });
    }

    return fulfill(route, {
      status: 404,
      body: { message: `Unhandled test API route: ${key}` },
    });
  });
}

export async function authenticate(
  page: Page,
  role: Role = "user",
  tier: Tier = "Free",
  email = role === "admin" ? TEST_ADMIN.email : TEST_USER.email,
) {
  const token = jwt(email, role, tier);
  await page.addInitScript((value) => {
    window.localStorage.setItem("token", value);
  }, token);
  return token;
}

export async function openLogin(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(250);
}

export async function openSignup(page: Page) {
  await openLogin(page);
  await page
    .getByRole("button", { name: "Don't have an account? Sign up" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Create an account" }),
  ).toBeVisible();
}

export async function fillSignup(
  page: Page,
  overrides: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }> = {},
) {
  const values = {
    firstName: "Focused",
    lastName: "User",
    email: TEST_USER.email,
    password: TEST_USER.password,
    ...overrides,
  };
  await page.getByLabel("First name").fill(values.firstName);
  await page.getByLabel("Last name").fill(values.lastName);
  await page.getByLabel("Email").fill(values.email);
  await page.getByLabel("Password").fill(values.password);
  await page.getByRole("checkbox").check();
}

export async function fillOtp(page: Page, otp: string) {
  const inputs = page.locator('input[inputmode="numeric"], input[maxlength="1"]');
  await expect(inputs).toHaveCount(6);
  for (const [index, digit] of [...otp].entries()) {
    await inputs.nth(index).fill(digit);
  }
}
