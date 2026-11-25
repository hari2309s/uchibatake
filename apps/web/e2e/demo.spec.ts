import { expect, test, type Page } from "@playwright/test";

async function openDemo(page: Page) {
  await page.clock.setFixedTime(new Date(2026, 10, 23, 9, 0));
  await page.goto("/");
  await page.getByRole("button", { name: "Explore without an account" }).click();
  await page.getByRole("button", { name: "Look around a family's field" }).click();
  await expect(page.getByRole("heading", { name: "Late autumn · first frosts" })).toBeVisible();
}

async function noSideScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
}

test("the demo is Sam & Rosie's field, with the season leading and Japan beneath", async ({ page }) => {
  await openDemo(page);
  await expect(page.getByText("Exploring Sam & Rosie's field")).toBeVisible();
  await expect(page.getByText("In Japan: rainbows hide.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Frost notice: Frost tonight/ })).toBeVisible();
  await expect(page.getByText("Put the fleece by the balcony door")).toBeVisible();
  await noSideScroll(page);
});

test("browse: spaces → balcony → kale → log a harvest, and the 収 seal stamps", async ({ page }) => {
  await openDemo(page);
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Spaces" }).click();
  await expect(page.getByRole("heading", { name: "Your spaces" })).toBeVisible();
  // Role queries skip pages Next keeps mounted but hidden.
  for (const name of ["Back garden", "Back balcony", "Kitchen windowsill", "Hallway rack", "Kitchen light shelf", "Lean-to greenhouse"]) await expect(page.getByRole("link", { name: new RegExp(`^${name}`) })).toBeVisible();
  await noSideScroll(page);
  await page.getByRole("link", { name: /^Back balcony/ }).click();
  await expect(page.getByRole("heading", { name: "Back balcony" })).toBeVisible();
  await expect(page.getByText("From above")).toBeVisible();
  await noSideScroll(page);
  await page.getByRole("link", { name: /^Kale by the door/ }).first().click();
  await expect(page.getByRole("heading", { name: "Kale by the door" })).toBeVisible();
  await expect(page.getByText("Its story so far")).toBeVisible();
  await page.getByRole("button", { name: "Log a harvest" }).click();
  const sheet = page.getByRole("dialog", { name: "Log a harvest" });
  await sheet.getByRole("checkbox", { name: "Rosie" }).click({ force: true });
  await sheet.getByRole("button", { name: "Save harvest" }).click();
  await expect(page.getByRole("dialog", { name: "Harvest logged" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Harvest logged" })).toBeVisible();
  await expect(page.getByText(/Kale by the door, about 200 g, picked by Rosie\./)).toBeVisible();
});

test("journal, seed box, family and reminders all open from the demo", async ({ page }) => {
  await openDemo(page);
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Journal" }).click();
  await expect(page.getByText("Coriander seeds saved for spring")).toBeVisible();
  await page.getByText("The first frosted kale").click();
  await expect(page.getByText("Written by Rosie")).toBeVisible();
  await page.goto("/journal/seeds");
  await expect(page.getByRole("heading", { name: "Seed box" })).toBeVisible();
  await expect(page.getByText("Aquadulce Claudia")).toBeVisible();
  await page.goto("/family");
  await expect(page.getByRole("listitem").filter({ hasText: /^Jules/ }).first()).toBeVisible();
  await expect(page.getByText("Who helped")).toBeVisible();
  await noSideScroll(page);
  await page.goto("/reminders");
  await expect(page.getByText("Morning round: water the windowsill")).toBeVisible();
});

test("the frost notice: tick a job, it stamps 済; 'All done' finishes it", async ({ page }) => {
  await openDemo(page);
  await page.getByRole("link", { name: /Frost notice: Frost tonight/ }).click();
  await expect(page.getByRole("heading", { name: /Frost tonight/ })).toBeVisible();
  await expect(page.getByText("Down to −2° in the night.")).toBeVisible();
  const basil = page.getByRole("checkbox", { name: "Slide the basil back from the window glass" });
  await basil.click({ force: true });
  await expect(basil).toBeChecked();
  await page.getByRole("button", { name: "All done" }).click();
  await expect(page.getByRole("heading", { name: "Late autumn · first frosts" })).toBeVisible();
});

test("leave the demo from the strip, and from Profile", async ({ page }) => {
  await openDemo(page);
  await page.getByRole("button", { name: "Leave the demo" }).first().click();
  await expect(page.getByRole("heading", { name: "Uchibatake" })).toBeVisible();
  await openDemo(page);
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Profile" }).click();
  await expect(page.getByRole("heading", { name: "Sam & Rosie's family" })).toBeVisible();
  await page.getByRole("button", { name: "Leave the demo" }).last().click();
  await expect(page.getByRole("heading", { name: "Uchibatake" })).toBeVisible();
});

test("app screens without a session go back to the front door", async ({ page }) => {
  await page.goto("/journal");
  await expect(page.getByRole("heading", { name: "Uchibatake" })).toBeVisible();
});
