import { expect, test } from "@playwright/test";

const articles = [
  {
    card: "Documents Needed for a Construction Cost Leakage Audit",
    heading: "Documents Needed for a Construction Cost Leakage Audit",
    path: "/blog/documents-needed-for-construction-cost-leakage-audit.html"
  },
  {
    card: "BOQ vs Actual: How to Read Construction Cost Overrun",
    heading: "BOQ vs Actual Cost Overrun in Construction",
    path: "/blog/boq-vs-actual-cost-overrun.html"
  },
  {
    card: "Construction Carbon Audit in India: Records to Prepare",
    heading: "Construction Carbon Audit India: Records to Prepare",
    path: "/blog/construction-carbon-audit-india.html"
  }
];

function captureRuntimeErrors(page) {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  return errors;
}

async function attachViewportScreenshot(page, testInfo, name) {
  await testInfo.attach(`${name}-${testInfo.project.name}`, {
    body: await page.screenshot({ fullPage: false }),
    contentType: "image/png"
  });
}

test("each blog card opens its complete article", async ({ page }, testInfo) => {
  const runtimeErrors = captureRuntimeErrors(page);

  for (const article of articles) {
    await page.goto("/blog/");
    await expect(page).toHaveTitle(/Constrovet Blog/);
    await expect(page.getByRole("heading", { name: "Constrovet Knowledge Notes" })).toBeVisible();

    const card = page.locator("a.cv-topic-card").filter({ hasText: article.card });
    await expect(card).toHaveAttribute("href", article.path);
    await card.click();

    await expect(page).toHaveURL(new RegExp(`${article.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
    await expect(page.getByRole("heading", { level: 1, name: article.heading })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Review sequence" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Decision-ready output" })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error/i);

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
    await attachViewportScreenshot(page, testInfo, article.path.split("/").at(-1).replace(".html", ""));
  }

  expect(runtimeErrors).toEqual([]);
});

test("service, blog, and team routes expose the correct active navigation parent", async ({ page }, testInfo) => {
  const runtimeErrors = captureRuntimeErrors(page);
  const routes = [
    { path: "/pages/construction-cost-leakage-audit.html", activeLabel: "Solution" },
    { path: "/blog/", activeLabel: "Knowledge" },
    { path: "/pages/team.html", activeLabel: "Company" }
  ];

  for (const route of routes) {
    await page.goto(route.path);
    await expect(page.locator("#cv-nav-placeholder nav")).toBeVisible();
    const activeDesktopLink = page.locator(".cv-nav__links a.active");
    await expect(activeDesktopLink).toHaveText(route.activeLabel);
    await expect(activeDesktopLink).toHaveAttribute("aria-current", "page");
  }

  if (testInfo.project.name === "mobile-chromium") {
    await page.goto("/blog/");
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.locator("#cv-drawer")).toHaveClass(/open/);
    await expect(page.locator("#cv-drawer a.active")).toHaveText("Knowledge");
    await attachViewportScreenshot(page, testInfo, "mobile-navigation-open");
  } else {
    await attachViewportScreenshot(page, testInfo, "desktop-active-navigation");
  }

  expect(runtimeErrors).toEqual([]);
});
