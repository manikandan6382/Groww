import { test, expect } from "@playwright/test";

test.describe("PortfolioX OrderPad Auto Deploy & RMS Feed Lifecycle", () => {
  test.beforeEach(async ({ request }) => {
    // Ensure clean flat desk in both .NET RMS and Node before test execution
    try {
      await request.post("http://127.0.0.1:5001/api/rms/positions/reset-test");
      await request.post("http://127.0.0.1:3004/api/paper-lab/square-off-all");
    } catch {
      // Non-blocking
    }
  });

  test("deploys compliant order, receives live ticks, holds position, and executes on stop-crossing tick", async ({ page, request }) => {
    page.on("console", (msg) => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on("pageerror", (err) => console.log(`[BROWSER ERROR] ${err.message}`));
    page.on("dialog", async (dialog) => {
      console.log(`[BROWSER DIALOG] ${dialog.type()}: ${dialog.message()}`);
      await dialog.accept();
    });

    // 1. Navigate to Practice Workspace
    await page.goto("/practice");
    await page.waitForLoadState("domcontentloaded");

    // 2. Ensure initial flat desk state
    await expect(page.locator("text=No Active Practice Trades")).toBeVisible({ timeout: 15000 });

    // 3. Select Testing / Sandbox Mode to ensure deterministic execution
    const testingModeBtn = page.locator('button:has-text("Testing / Sandbox")');
    if (await testingModeBtn.isVisible()) {
      await testingModeBtn.click();
    }

    // 4. Click Lock Net Invariant to calibrate canonical SL & Target (Net ₹250 / 1:2 R:R)
    const lockInvariantBtn = page.locator('button:has-text("Lock Net Invariant")');
    if (await lockInvariantBtn.isVisible()) {
      await lockInvariantBtn.click();
    }

    // 5. Locate Deploy Button and verify it is armed
    const deployBtn = page.locator('[data-testid="order-deploy-btn"]');
    await expect(deployBtn).toBeVisible({ timeout: 10000 });
    await expect(deployBtn).toBeEnabled({ timeout: 10000 });

    // 6. Deploy the Trade
    await deployBtn.click();

    // 7. Verify .NET RMS receives and registers active position with valid keys
    let activePosition = null;
    await expect.poll(async () => {
      try {
        const res = await request.get("http://127.0.0.1:5001/api/rms/positions");
        if (!res.ok()) return 0;
        const positions = await res.json();
        if (positions.length > 0) {
          activePosition = positions[0];
          return positions.length;
        }
        return 0;
      } catch {
        return 0;
      }
    }, { timeout: 15000, intervals: [300, 500, 1000] }).toBeGreaterThanOrEqual(1);

    expect(activePosition).not.toBeNull();
    expect(activePosition.id).toBeTruthy();
    expect(activePosition.symbol).toBeTruthy();
    expect(activePosition.instrumentKey).toBeTruthy();
    expect(Number(activePosition.entryPrice)).toBeGreaterThan(0);
    expect(Number(activePosition.stopLoss)).toBeGreaterThan(0);
    expect(Number(activePosition.target)).toBeGreaterThan(Number(activePosition.stopLoss));

    // 8. Verify Frontend UI renders active practice trade card
    await expect(page.locator('[data-testid="live-alert-card"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=No Active Practice Trades")).not.toBeVisible();

    // 9. Send Non-Triggering Market Tick (Price at entry)
    const nonTriggerTick = {
      instrumentKey: activePosition.instrumentKey,
      ltp: Number(activePosition.entryPrice),
      high: Number(activePosition.entryPrice) + 1.0,
      low: Number(activePosition.entryPrice) - 0.5,
      volume: 1000
    };

    const nonTriggerRes = await request.post("http://127.0.0.1:5001/api/rms/tick", {
      data: nonTriggerTick
    });
    expect(nonTriggerRes.ok()).toBeTruthy();

    // Position must remain open and monitored
    await page.waitForTimeout(1000);
    const rmsCheck = await (await request.get("http://127.0.0.1:5001/api/rms/positions")).json();
    expect(rmsCheck.some(p => p.id === activePosition.id)).toBeTruthy();
    await expect(page.locator('[data-testid="live-alert-card"]')).toBeVisible();

    // 10. Send Legitimate Stop-Crossing Market Tick (Strictly below Stop Loss for Long)
    const stopCrossingPrice = Number(Math.max(0.05, activePosition.stopLoss - 1.5).toFixed(2));
    const triggerTick = {
      instrumentKey: activePosition.instrumentKey,
      ltp: stopCrossingPrice,
      high: Number(activePosition.entryPrice),
      low: stopCrossingPrice,
      volume: 5000
    };

    const triggerRes = await request.post("http://127.0.0.1:5001/api/rms/tick", {
      data: triggerTick
    });
    expect(triggerRes.ok()).toBeTruthy();

    // 11. Verify RMS evaluates stop loss and unregisters the position
    await expect.poll(async () => {
      try {
        const res = await request.get("http://127.0.0.1:5001/api/rms/positions");
        if (!res.ok()) return -1;
        const positions = await res.json();
        return positions.filter(p => p.id === activePosition.id).length;
      } catch {
        return -1;
      }
    }, { timeout: 15000, intervals: [300, 500, 1000] }).toBe(0);

    // 12. Verify Frontend UI reflects settled trade
    await expect(page.locator('[data-testid="live-alert-card"]')).not.toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=No Active Practice Trades")).toBeVisible({ timeout: 15000 });

    // 13. Verify Database persistence of settled trade
    const dbRes = await request.get("http://localhost:3003/api/trades?range=today");
    expect(dbRes.ok()).toBeTruthy();
    const tradeData = await dbRes.json();
    const settledTrade = tradeData.items?.find(t => 
      t.status === "CLOSED" && (t.symbol === activePosition.symbol || t.idempotencyKey)
    );
    expect(settledTrade).toBeDefined();
    expect(settledTrade.exitPrice).toBeDefined();
    expect(settledTrade.closeReason).toBeTruthy();
  });
});
