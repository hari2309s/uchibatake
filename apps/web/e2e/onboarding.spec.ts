import { expect, test, type Page } from "@playwright/test";

/** The design's day, so the first-season plan is the same whenever the tests run. */
async function onTheDesignsDay(page: Page) {
  await page.clock.setFixedTime(new Date(2026, 10, 23, 9, 0));
}

async function mockGeocoding(page: Page) {
  await page.route("https://geocoding-api.open-meteo.com/**", (route) =>
    route.fulfill({ json: { results: [{ name: "Amsterdam", latitude: 52.37403, longitude: 4.88969, admin1: "North Holland", country: "Netherlands" }] } })
  );
}

test("the front door: sign in, or explore without an account", async ({ page }) => {
  await onTheDesignsDay(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Uchibatake" })).toBeVisible();
  await expect(page.getByText("Rainbows hide.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Explore without an account" })).toBeVisible();
  await expect(page.getByText(/Continue with Apple/)).toHaveCount(0);
});

test("onboarding as a guest → first plan → Home with the plan's jobs", async ({ page }) => {
  await onTheDesignsDay(page);
  await mockGeocoding(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Explore without an account" }).click();
  await page.getByRole("button", { name: "Start my own field" }).click();

  await expect(page.getByRole("heading", { name: "Where will you grow?" })).toBeVisible();
  for (const name of [/^Balcony/, /^Indoors, on a windowsill/, /^Backyard/]) await page.getByRole("checkbox", { name }).click({ force: true });
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "How much sun does the spot get?" })).toBeVisible();
  await page.getByRole("radio", { name: /^Full sun/ }).click({ force: true });
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Where are you?" })).toBeVisible();
  await page.getByLabel("Town or neighbourhood").fill("Amsterdam");
  await page.getByRole("button", { name: /^Amsterdam/ }).click();
  await expect(page.getByText("Found by name")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Who are you growing for?" })).toBeVisible();
  await page.getByLabel("What should we call you?").fill("Saskia");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Have you grown things before?" })).toBeVisible();
  await page.getByRole("radio", { name: /^Never grown anything/ }).click({ force: true });
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Your first season" })).toBeVisible();
  await expect(page.getByText(/LATE AUTUMN · AMSTERDAM · TWO OF US/i)).toBeVisible();
  await expect(page.getByText("Garlic", { exact: true })).toBeVisible();
  await expect(page.getByText(/before mid-December/)).toBeVisible();
  await page.getByRole("button", { name: "Begin my season" }).click();

  await expect(page.getByRole("heading", { name: "Saskia's family" })).toBeVisible();
  await expect(page.getByText("Plant garlic")).toBeVisible();
  // It's on the device: a reload comes straight back to Home.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Saskia's family" })).toBeVisible();
});

test("location asks first (M04), with words true to what happens", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore without an account" }).click();
  await page.getByRole("button", { name: "Start my own field" }).click();
  await page.goto("/start/location");
  await page.getByRole("button", { name: "Use my current location" }).click();
  await expect(page.getByRole("heading", { name: "Where is your field?" })).toBeVisible();
  await expect(page.getByText(/to fetch your weather/)).toBeVisible();
  await expect(page.getByText(/never leaves/)).toHaveCount(0);
  await page.getByRole("button", { name: "Not now" }).click();
  await expect(page.getByRole("heading", { name: "Where are you?" })).toBeVisible();
});

test("explore the demo from the front door", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore without an account" }).click();
  await page.getByRole("button", { name: "Look around a family's field" }).click();
  await expect(page.getByRole("heading", { name: "Hari & Saskia's family" })).toBeVisible();
  await expect(page.getByText("Put the fleece by the balcony door")).toBeVisible();
});

test("welcome back (M02) for an account this device remembers; 'Not Hari?' goes to sign-in", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("uchibatake-last-account", JSON.stringify({ id: "u1", email: "hari@example.com", name: "Hari", provider: "google", place: "De Pijp", seasonTable: "amsterdam" }))
  );
  await onTheDesignsDay(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome back, Hari." })).toBeVisible();
  await expect(page.getByText("Late autumn · first frosts")).toBeVisible();
  await expect(page.getByText("In Japan: rainbows hide.")).toBeVisible();
  await page.getByRole("button", { name: "Not Hari? Use another account" }).click();
  await expect(page.getByRole("heading", { name: "Uchibatake" })).toBeVisible();
});

test("a sign-in link that doesn't work says so calmly", async ({ page }) => {
  await page.goto("/auth/callback");
  await expect(page.getByRole("heading", { name: "That link didn't work" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Send a new link" })).toBeVisible();
});

test("email link: the address goes to Supabase, then M01 shows it", async ({ page }) => {
  await page.route("**/auth/v1/otp**", (route) => route.fulfill({ json: {} }));
  await page.goto("/sign-in?email=1");
  await expect(page.getByRole("heading", { name: "Uchibatake" })).toBeVisible();
  test.skip(!(await page.getByRole("button", { name: /Continue with Google/ }).isVisible()), "Supabase isn't configured in this build");
  const sheet = page.getByRole("dialog", { name: "Email me a sign-in link" });
  await sheet.getByLabel("Your email").fill("hari@example.com");
  await sheet.getByRole("button", { name: "Send the link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await expect(page.getByText("hari@example.com")).toBeVisible();
  await expect(page.getByText(/Send again in 0:/)).toBeVisible();
});

test("a returning guest goes straight back to their field, not through onboarding again", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore without an account" }).click();
  await page.getByRole("button", { name: "Start my own field" }).click();
  // Skip everything (with no spaces there's no sun step), waiting for each step to arrive.
  for (const heading of ["Where will you grow?", "Where are you?", "Who are you growing for?", "Have you grown things before?"]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await page.getByRole("button", { name: "Skip" }).click();
  }
  await page.getByRole("button", { name: "Begin my season" }).click();
  await expect(page.getByRole("heading", { name: "Our field" })).toBeVisible();
  // Leave (the session ends; the field stays on the device), then come back.
  await page.evaluate(() => localStorage.removeItem("uchibatake-session"));
  await page.goto("/");
  await page.getByRole("button", { name: "Explore without an account" }).click();
  await page.getByRole("button", { name: "Start my own field" }).click();
  await expect(page.getByRole("heading", { name: "Our field" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Where will you grow?" })).toHaveCount(0);
});
