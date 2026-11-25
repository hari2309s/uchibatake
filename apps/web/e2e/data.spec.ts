import { expect, test } from "@playwright/test";

test("the demo household opens from nothing, with the designs' family and field", async ({ page }) => {
  await page.goto("/dev/data");
  await page.getByRole("button", { name: "Explore the demo" }).click();
  await expect(page.getByRole("heading", { name: "Hari & Saskia's family" })).toBeVisible();
  await expect(page.getByTestId("count-People")).toHaveText("6");
  await expect(page.getByTestId("count-Spaces")).toHaveText("3");
  await expect(page.getByTestId("count-Growing")).toHaveText("11");
  await expect(page.getByText("Put the fleece by the balcony door")).toBeVisible();
});

test("ticking a job stamps 済 and survives a reload (stored on the device)", async ({ page }) => {
  await page.goto("/dev/data");
  await page.getByRole("button", { name: "Explore the demo" }).click();
  const job = page.getByRole("checkbox", { name: /Water the windowsill pots/ });
  await expect(job).not.toBeChecked();
  // The box follows the database: click, then wait for the stored state.
  await job.click({ force: true });
  await expect(job).toBeChecked();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: /Water the windowsill pots/ })).toBeChecked();
});

test("a guest starts with an empty field of their own, and can leave", async ({ page }) => {
  await page.goto("/dev/data");
  await page.getByRole("button", { name: "Start my own field" }).click();
  await expect(page.getByRole("heading", { name: "Our field" })).toBeVisible();
  await expect(page.getByTestId("count-Spaces")).toHaveText("0");
  await page.getByRole("button", { name: "Leave this field" }).click();
  await expect(page.getByRole("button", { name: "Explore the demo" })).toBeVisible();
});

test("leaving and coming back reopens the same guest field (no orphaned databases)", async ({ page }) => {
  await page.goto("/dev/data");
  await page.getByRole("button", { name: "Start my own field" }).click();
  await expect(page.getByRole("heading", { name: "Our field" })).toBeVisible();
  await page.getByRole("button", { name: "Leave this field" }).click();
  await page.getByRole("button", { name: "Start my own field" }).click();
  await expect(page.getByRole("heading", { name: "Our field" })).toBeVisible();
  const guestDbs = await page.evaluate(async () => (await indexedDB.databases()).filter((d) => d.name?.startsWith("uchibatake-guest-")).length);
  expect(guestDbs).toBe(1);
});
