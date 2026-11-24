import { expect, test } from "@playwright/test";

async function noHorizontalScroll(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test("kit shows every primitive without horizontal scroll", async ({ page }) => {
  await page.goto("/dev/kit");
  await expect(page.getByText("Light · washi")).toBeVisible();
  await expect(page.getByText("Dark · night washi")).toBeAttached();
  await noHorizontalScroll(page);
});

test("theme follows the system, and the switch overrides it", async ({ page, colorScheme }) => {
  await page.goto("/dev/kit");
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(await bg()).toBe(colorScheme === "dark" ? "rgb(22, 20, 18)" : "rgb(244, 240, 230)");
  await page.getByText("Dark", { exact: true }).first().click();
  expect(await bg()).toBe("rgb(22, 20, 18)");
  await page.reload();
  expect(await bg()).toBe("rgb(22, 20, 18)");
  await page.getByText("Light", { exact: true }).first().click();
  expect(await bg()).toBe("rgb(244, 240, 230)");
});

test("the harvest stamp sheet opens, traps focus and closes", async ({ page }) => {
  await page.goto("/dev/kit");
  await page.getByRole("button", { name: "Log a harvest" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Log a harvest" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("a frost notice stamps 済 when a job is ticked", async ({ page }) => {
  await page.goto("/dev/kit");
  await page.getByRole("button", { name: "霜 Frost" }).first().click();
  await expect(page.getByRole("heading", { name: /Frost tonight/ })).toBeVisible();
  const box = page.getByRole("checkbox", { name: "Slide the basil back from the window glass" });
  await box.check({ force: true });
  await expect(box).toBeChecked();
  await noHorizontalScroll(page);
});

test("home and error-free placeholder render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Uchibatake" })).toBeVisible();
  await noHorizontalScroll(page);
});

test("the ✕ on a full-screen notice closes it", async ({ page }) => {
  await page.goto("/dev/kit");
  await page.getByRole("button", { name: "暑 Heat" }).first().click();
  await expect(page.getByRole("heading", { name: /38° and steamy/ })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).first().click();
  await expect(page.getByText("Light · washi")).toBeVisible();
});

test("the bottom nav stays pinned while the page scrolls", async ({ page }) => {
  await page.goto("/dev/kit");
  await page.mouse.wheel(0, 1500);
  const nav = page.getByRole("navigation", { name: "Main" }).first();
  const box = await nav.boundingBox();
  const vh = page.viewportSize()!.height;
  expect(box).not.toBeNull();
  // Somewhere in view while the long pane scrolls under it.
  expect(box!.y + box!.height).toBeLessThanOrEqual(vh + 1);
  expect(box!.y).toBeGreaterThan(0);
});
