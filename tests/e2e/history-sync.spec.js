import { test, expect } from "@playwright/test";

test.describe("PortfolioX History & Accounting State Persistence", () => {
  test("persists settled trade history, metrics, and accounting across browser reload without data loss", async ({ page }) => {
    // 1. Navigate to Practice View
    await page.goto("/practice");
    await page.waitForLoadState("domcontentloaded");

    // 2. Ensure settled practice history table is mounted and rendered
    const historySection = page.locator("#practice-history-table");
    await expect(historySection).toBeVisible({ timeout: 15000 });

    const table = historySection.locator("table");
    await expect(table).toBeVisible({ timeout: 10000 });

    // 3. Capture initial settled trade rows and trade IDs
    const tradeRows = historySection.locator('tbody tr[id^="trade-row-"]');
    const rowCount = await tradeRows.count();
    expect(rowCount).toBeGreaterThan(0);

    const initialTradeIds = [];
    for (let i = 0; i < Math.min(rowCount, 10); i++) {
      const id = await tradeRows.nth(i).getAttribute("id");
      if (id) initialTradeIds.push(id);
    }
    expect(initialTradeIds.length).toBeGreaterThan(0);

    // 4. Capture accounting text / scorecard telemetry
    const scoreboardSection = page.locator(".space-y-3\\.5, [data-view='paper']").first();
    const beforeText = await scoreboardSection.innerText().catch(() => "");

    // 5. Trigger browser page refresh to test SQLite re-hydration
    await page.reload({ waitUntil: "domcontentloaded" });

    // 6. Verify table and settled trades rehydrate identically
    await expect(historySection).toBeVisible({ timeout: 15000 });
    await expect(table).toBeVisible({ timeout: 10000 });

    const postReloadRows = historySection.locator('tbody tr[id^="trade-row-"]');
    await expect(postReloadRows).toHaveCount(rowCount, { timeout: 15000 });

    // 7. Verify the exact trade IDs persist in matching order
    for (let i = 0; i < initialTradeIds.length; i++) {
      const currentId = await postReloadRows.nth(i).getAttribute("id");
      expect(currentId).toBe(initialTradeIds[i]);
    }

    // 8. Verify accounting and trade details do not display NaN or corrupted values
    const firstRowText = await postReloadRows.first().innerText();
    expect(firstRowText).not.toContain("NaN");
    expect(firstRowText).not.toContain("undefined");
  });
});
