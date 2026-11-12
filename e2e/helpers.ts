import { expect, type Browser, type Page } from "@playwright/test";

/** Same password as prisma/seed.ts. */
export const DEMO_PASSWORD = "CampusTrace1!";

export const USERS = {
  desk: "desk@ucc.edu.gh",
  kofi: "kofi.mensah@stu.ucc.edu.gh",
  ama: "ama.boateng@stu.ucc.edu.gh",
  yaw: "yaw.asante@stu.ucc.edu.gh",
  esi: "esi.quansah@stu.ucc.edu.gh",
} as const;

/** Opens a separate browser session (its own cookies) signed in as one user. */
export async function signedInPage(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel("University email").fill(email);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
  return page;
}

/** The smallest valid PNG: one transparent pixel. */
export const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

/** Tomorrow at 10:00 in the format a datetime-local input expects. */
export function tomorrowAtTen(): string {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return `${tomorrow.toISOString().slice(0, 10)}T10:00`;
}
