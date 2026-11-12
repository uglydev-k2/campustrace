import { expect, test } from "@playwright/test";
import { signedInPage, USERS } from "./helpers";

test.describe("access control", () => {
  test("signed-out visitors are sent to sign in, then back to where they were going", async ({
    page,
  }) => {
    await page.goto("/report/found");
    await expect(page).toHaveURL(/\/login\?next=%2Freport%2Ffound/);

    await page.getByLabel("University email").fill(USERS.yaw);
    await page.getByLabel("Password").fill("CampusTrace1!");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: "Report something you found" })).toBeVisible();
  });

  test("a wrong password is refused without saying which part was wrong", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("University email").fill(USERS.yaw);
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    // Next.js adds an empty role="alert" route announcer, so match ours by text.
    await expect(page.getByRole("alert").filter({ hasText: "do not match" })).toBeVisible();
  });

  test("students cannot open the desk area", async ({ browser }) => {
    const student = await signedInPage(browser, USERS.yaw);
    const response = await student.goto("/admin");
    expect(response?.status()).toBe(404);
    await expect(student.getByRole("link", { name: "Desk" })).toHaveCount(0);
    await student.context().close();
  });

  test("the desk sees its queues", async ({ browser }) => {
    const desk = await signedInPage(browser, USERS.desk);
    await desk.goto("/admin");
    await expect(desk.getByRole("heading", { name: "Collection desk" })).toBeVisible();
    await expect(desk.getByRole("heading", { name: "Claims to review" })).toBeVisible();
    await desk.context().close();
  });

  test("a finder cannot claim the item they reported", async ({ browser }) => {
    // Kofi reported the seeded laptop charger.
    const kofi = await signedInPage(browser, USERS.kofi);
    await kofi.goto("/browse?q=laptop+charger");
    await kofi.getByRole("link", { name: "Black HP laptop charger" }).click();
    await kofi.waitForURL(/\/reports\/[^/]+$/);
    await expect(kofi.getByRole("link", { name: "Claim this item" })).toHaveCount(0);

    // Going to the claim form directly is refused too.
    await kofi.goto(`${new URL(kofi.url()).pathname}/claim`);
    await expect(kofi.getByText("You reported this item, so you cannot claim it.")).toBeVisible();
    await kofi.context().close();
  });

  test("photos of ID cards are kept off the public report", async ({ page }) => {
    await page.goto("/browse?q=Student+ID+card");
    await page.getByRole("link", { name: "Student ID card" }).click();
    // The finder's private note names the card holder; the public page must not.
    await expect(page.getByText("Name on the card")).toHaveCount(0);
  });
});

test.describe("forms", () => {
  test("the report form explains what is missing and keeps what was typed", async ({ browser }) => {
    const page = await signedInPage(browser, USERS.yaw);
    await page.goto("/report/found");
    await page.getByLabel("What is it?").fill("Umbrella");
    await page.getByRole("button", { name: "Publish report" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "Check the highlighted fields" }),
    ).toBeVisible();
    await expect(page.getByText("Choose a category.")).toBeVisible();
    await expect(page.getByText("Describe the item in a sentence or two.")).toBeVisible();
    // What the user typed is still there.
    await expect(page.getByLabel("What is it?")).toHaveValue("Umbrella");
    // Focus moves to the first field that needs attention.
    await expect(page.getByLabel("Category")).toBeFocused();
    await page.context().close();
  });

  test("a file that is not really an image is rejected", async ({ browser }) => {
    const page = await signedInPage(browser, USERS.yaw);
    await page.goto("/report/lost");
    await page.getByLabel("What is it?").fill("Black umbrella");
    await page.getByLabel("Category").selectOption("OTHER");
    await page.getByLabel("Description", { exact: true }).fill("A black umbrella with a hooked handle.");
    await page.getByLabel("Where do you think you lost it?").selectOption("Sam Jonah Library");
    // An HTML file renamed to look like a PNG.
    await page.getByLabel("Photo of the item").setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: Buffer.from("<script>alert('not an image')</script>"),
    });
    await page.getByRole("button", { name: "Publish report" }).click();
    await expect(page.getByText("is not a JPEG, PNG or WebP file").first()).toBeVisible();
    await page.context().close();
  });

  test("registration is limited to university email addresses", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Full name").fill("Test Person");
    await page.getByLabel("University email").fill("someone@gmail.com");
    await page.getByLabel("Password").fill("a-long-password");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Use your university email")).toBeVisible();
  });

  test("a new student can register and is signed in", async ({ page }) => {
    const email = `new.student.${Date.now()}@stu.ucc.edu.gh`;
    await page.goto("/register");
    await page.getByLabel("Full name").fill("Efua Darko");
    await page.getByLabel("University email").fill(email);
    await page.getByLabel("Password").fill("a-long-password");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { name: "Welcome back, Efua" })).toBeVisible();
  });
});
