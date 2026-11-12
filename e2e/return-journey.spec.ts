import { expect, test, type Page } from "@playwright/test";
import { signedInPage, TINY_PNG, tomorrowAtTen, USERS } from "./helpers";

/**
 * The whole product in one test file:
 *
 *   found item reported -> published -> owner claims with private evidence ->
 *   desk approves -> (collection is BLOCKED) -> desk records custody ->
 *   collection scheduled -> handover recorded -> owner confirms receipt
 *
 * Three people take part, each in their own browser session.
 * The steps run in order and share the pages below.
 */
test.describe.configure({ mode: "serial" });

const ITEM = `Green steel water bottle ${Date.now()}`;
const PRIVATE_NOTE = "Sticker of a tortoise on the base";

let finder: Page; // Kofi finds the bottle
let owner: Page; // Ama owns it
let desk: Page; // Abena staffs the collection desk
let reportUrl = "";
let claimUrl = "";
let evidenceUrl = "";

test.beforeAll(async ({ browser }) => {
  finder = await signedInPage(browser, USERS.kofi);
  owner = await signedInPage(browser, USERS.ama);
  desk = await signedInPage(browser, USERS.desk);
});

test.afterAll(async () => {
  await Promise.all([finder, owner, desk].map((page) => page?.context().close()));
});

test("1. the finder reports a found item and it is published", async () => {
  await finder.goto("/report/found");
  await finder.getByLabel("What is it?").fill(ITEM);
  await finder.getByLabel("Category").selectOption("OTHER");
  await finder.getByLabel("Public description").fill("A green steel water bottle left on a bench.");
  await finder.getByLabel("Details only the owner would know").fill(PRIVATE_NOTE);
  await finder.getByLabel("Where did you find it?").selectOption("Sam Jonah Library");
  await finder.getByLabel("Photo of the item").setInputFiles({
    name: "bottle.png",
    mimeType: "image/png",
    buffer: TINY_PNG,
  });
  await finder.getByLabel("Where will you drop it off?").selectOption({ index: 1 });
  await finder.getByRole("button", { name: "Publish report" }).click();

  await expect(finder.getByRole("status")).toContainText("Report published");
  await expect(finder.getByRole("heading", { level: 1, name: ITEM })).toBeVisible();
  await expect(finder.getByText("Next: drop it off")).toBeVisible();
  reportUrl = new URL(finder.url()).pathname;
});

test("2. the report survives a refresh and appears in search without private details", async ({
  page,
}) => {
  // `page` is a fresh, signed-out visitor.
  await page.goto(`/browse?q=${encodeURIComponent(ITEM)}`);
  await expect(page.getByText("1 item")).toBeVisible();
  await page.getByRole("link", { name: ITEM }).click();

  await expect(page.getByRole("heading", { level: 1, name: ITEM })).toBeVisible();
  await expect(page.getByText(PRIVATE_NOTE)).toHaveCount(0);
  await expect(page.getByText("Kofi Mensah")).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: ITEM })).toBeVisible();
});

test("3. the owner publishes a lost report, then claims the item with private evidence", async () => {
  await owner.goto("/report/lost");
  await owner.getByLabel("What is it?").fill(`My ${ITEM}`);
  await owner.getByLabel("Category").selectOption("OTHER");
  await owner.getByLabel("Description", { exact: true }).fill("Green steel bottle, lost in the library.");
  await owner.getByLabel("Where do you think you lost it?").selectOption("Sam Jonah Library");
  await owner.getByRole("button", { name: "Publish report" }).click();
  await expect(owner.getByRole("status")).toContainText("Report published");

  await owner.goto(reportUrl);
  await owner.getByRole("link", { name: "Claim this item" }).click();
  await owner
    .getByLabel("How can you show it is yours?")
    .fill("It has a sticker of a tortoise on the base and a dent near the lid.");
  await owner.getByLabel("Supporting files").setInputFiles({
    name: "receipt.png",
    mimeType: "image/png",
    buffer: TINY_PNG,
  });
  await owner.getByLabel("Link your lost report").selectOption({ index: 1 });
  await owner.getByLabel("This item is mine and what I have written is true").check();
  await owner.getByRole("button", { name: "Submit claim" }).click();

  await expect(owner.getByRole("status")).toContainText("Claim submitted");
  await expect(owner.getByText("The desk is reviewing your claim")).toBeVisible();
  claimUrl = new URL(owner.url()).pathname;
  evidenceUrl = (await owner.getByRole("img", { name: /Evidence/ }).getAttribute("src")) ?? "";
  expect(evidenceUrl).toMatch(/^\/api\/files\//);
});

test("4. the claim and its evidence are hidden from the finder and from visitors", async ({
  page,
}) => {
  // The finder learns that a claim exists, but cannot open it.
  await finder.goto("/notifications");
  await expect(finder.getByText("Someone has claimed the item you found").first()).toBeVisible();

  const finderClaim = await finder.goto(claimUrl);
  expect(finderClaim?.status()).toBe(404);
  const finderEvidence = await finder.request.get(evidenceUrl);
  expect(finderEvidence.status()).toBe(404);

  // A signed-out visitor is sent to sign in, and cannot fetch the file.
  await page.goto(claimUrl);
  await expect(page).toHaveURL(/\/login/);
  const visitorEvidence = await page.request.get(evidenceUrl);
  expect(visitorEvidence.status()).toBe(404);

  // The owner can.
  const ownerEvidence = await owner.request.get(evidenceUrl);
  expect(ownerEvidence.status()).toBe(200);
  expect(ownerEvidence.headers()["content-type"]).toBe("image/png");
});

test("5. the desk approves the claim before the item arrives, and collection is blocked", async () => {
  await desk.goto("/admin");
  await desk.locator("#review").getByRole("link", { name: ITEM }).click();

  // The desk sees both accounts side by side.
  await expect(desk.getByText("sticker of a tortoise on the base and a dent")).toBeVisible();
  await expect(desk.getByText(PRIVATE_NOTE, { exact: true })).toBeVisible();

  await desk.getByRole("button", { name: "Approve claim" }).click();
  await expect(desk.getByRole("status")).toContainText("Claim approved");

  // The custody gate: no way to schedule or hand over yet.
  await expect(desk.getByTestId("custody-gate")).toContainText("Collection is blocked");
  await expect(desk.getByLabel("Collection date and time")).toHaveCount(0);
  await expect(desk.getByRole("button", { name: "Record handover" })).toHaveCount(0);

  // The owner is told to wait rather than travel.
  await owner.goto(claimUrl);
  await expect(owner.getByText("Approved. Waiting for the item to arrive")).toBeVisible();
});

test("6. the desk records custody when the finder hands the item in", async () => {
  await desk.goto(reportUrl);
  await desk.getByLabel("Shelf or tag label").fill("LIB-E2E");
  await desk.getByRole("button", { name: "Record custody" }).click();

  await expect(desk.getByRole("status")).toContainText("Custody recorded");
  await expect(desk.getByText("At a collection point")).toBeVisible();

  await finder.goto(reportUrl);
  await expect(finder.getByText("Thank you for handing it in")).toBeVisible();
});

test("7. with custody confirmed, the desk schedules the collection", async () => {
  await desk.goto(claimUrl);
  await expect(desk.getByTestId("custody-gate")).toHaveCount(0);

  await desk.getByLabel("Collection date and time").fill(tomorrowAtTen());
  await desk.getByLabel("Instructions for the owner").fill("Ask for Abena at the help desk.");
  await desk.getByRole("button", { name: "Schedule collection" }).click();
  await expect(desk.getByRole("status")).toContainText("Collection time saved");

  await owner.goto(claimUrl);
  await expect(owner.getByText("Collect your item")).toBeVisible();
  await expect(owner.getByText("Ask for Abena at the help desk.")).toBeVisible();
  // The shelf label is for desk staff only.
  await expect(owner.getByText("LIB-E2E")).toHaveCount(0);
});

test("8. the desk records the handover only after checking ID", async () => {
  await desk.goto(claimUrl);
  await desk.getByRole("button", { name: "Record handover" }).click();
  await expect(desk.getByText("Check the collector's student ID before handing over.")).toBeVisible();

  await desk.getByLabel("I checked the collector's student ID against this claim").check();
  await desk.getByRole("button", { name: "Record handover" }).click();
  await expect(desk.getByRole("status")).toContainText("Handover recorded");
});

test("9. the owner confirms receipt and the return is complete everywhere", async ({ page }) => {
  await owner.goto("/notifications");
  await owner.getByRole("button", { name: /Please confirm you have your item/ }).first().click();
  await expect(owner).toHaveURL(new RegExp(claimUrl));

  await owner.getByRole("button", { name: "I have received my item" }).click();
  await expect(owner.getByRole("status")).toContainText("Receipt confirmed");
  await expect(owner.getByText("Return complete")).toBeVisible();

  // Still complete after a refresh: the state lives in the database.
  await owner.reload();
  await expect(owner.getByText("Return complete")).toBeVisible();

  // The public report shows the outcome and can no longer be claimed.
  await page.goto(reportUrl);
  await expect(page.getByText("Returned to owner")).toBeVisible();
  await expect(page.getByText("Item returned to its owner.")).toBeVisible();
  await expect(page.getByRole("link", { name: /claim this item/i })).toHaveCount(0);

  // The linked lost report was resolved automatically.
  await owner.goto("/dashboard");
  await owner.getByRole("link", { name: `My ${ITEM}` }).click();
  await expect(owner.getByText("Recovered")).toBeVisible();

  // The finder is thanked.
  await finder.goto("/notifications");
  await expect(finder.getByText("It is back with its owner").first()).toBeVisible();
});
