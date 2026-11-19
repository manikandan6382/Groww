import { test, expect } from "@playwright/test";

test.describe("PortfolioX OrderPad Risk Guards & Invariant Enforcement", () => {
  test.beforeEach(async ({ request }) => {
    try {
      await request.post("http://127.0.0.1:5001/api/rms/positions/reset-test");
    } catch {
      // Non-blocking
    }
  });

  test("UI & Server Guard: Rejects orders with capital risk > ₹300", async ({ page, request }) => {
    await page.goto("/practice");
    await page.waitForLoadState("domcontentloaded");

    // 1. Switch to Live Auto-Exit Mode to enforce strict capital protection
    const liveModeBtn = page.locator('button:has-text("Live Auto-Exit")');
    if (await liveModeBtn.isVisible()) {
      await liveModeBtn.click();
    }

    // 2. Locate Stop Loss input and set a large risk distance (> ₹300 net risk)
    const slInput = page.locator('[data-testid="stop-loss-input"]');
    await expect(slInput).toBeVisible({ timeout: 10000 });
    await slInput.fill("10.00");

    // 3. Verify Deploy button is disabled with risk warning
    const deployBtn = page.locator('[data-testid="order-deploy-btn"]');
    await expect(deployBtn).toBeDisabled();
    await expect(page.locator("text=/Capital Risk Breached|RISK CEILING BREACH|> ₹300/").first()).toBeVisible();

    // 4. Server-Side Direct Verification: .NET RMS must reject with HTTP 400
    const serverRes = await request.post("http://127.0.0.1:5001/api/orders/deploy", {
      data: {
        symbol: "NIFTY26NOV24000CE",
        instrumentKey: "NSE_FO|54098",
        price: 100.0,
        stopLoss: 50.0, // 50 pts * 65 qty = ₹3,250 risk >> ₹300
        target: 200.0,
        quantity: 65,
        transactionType: 1,
        product: 1,
        orderType: 5,
        testingMode: false
      }
    });

    expect(serverRes.status()).toBe(400);
    const body = await serverRes.json();
    expect(body.error).toMatch(/exceeds maximum risk limit|risk|circuit breaker/i);
  });

  test("UI & Server Guard: Rejects orders with Reward-to-Risk < 2:1", async ({ page, request }) => {
    await page.goto("/practice");
    await page.waitForLoadState("domcontentloaded");

    const liveModeBtn = page.locator('button:has-text("Live Auto-Exit")');
    if (await liveModeBtn.isVisible()) {
      await liveModeBtn.click();
    }

    // 1. Set Entry, Stop Loss and Inverted/Deficit Target in UI
    const targetInput = page.locator('[data-testid="target-price-input"]');
    await expect(targetInput).toBeVisible({ timeout: 10000 });
    // Invalidate target to yield tiny reward (< 2:1 R:R)
    await targetInput.fill("49.00");

    const deployBtn = page.locator('[data-testid="order-deploy-btn"]');
    await expect(deployBtn).toBeDisabled();
    await expect(page.locator("text=/Reward-to-Risk Rejected|R:R DEFICIT|< 2:1/").first()).toBeVisible();

    // 2. Server-Side Verification: .NET RMS rejects non-compliant R:R with HTTP 400
    const serverRes = await request.post("http://127.0.0.1:5001/api/orders/deploy", {
      data: {
        symbol: "NIFTY26NOV24000CE",
        instrumentKey: "NSE_FO|54098",
        price: 100.0,
        stopLoss: 97.0,
        target: 101.0,
        quantity: 1,
        transactionType: 1,
        product: 1,
        orderType: 5,
        testingMode: false
      }
    });

    expect(serverRes.status()).toBe(400);
    const body = await serverRes.json();
    expect(body.error).toMatch(/Risk:Reward|circuit breaker|insufficient/i);
  });

  test("Server Guard: Rejects order when daily loss budget is exhausted", async ({ request }) => {
    const serverRes = await request.post("http://127.0.0.1:5001/api/orders/deploy", {
      data: {
        symbol: "NIFTY26NOV24000CE",
        instrumentKey: "NSE_FO|54098",
        price: 100.0,
        stopLoss: 96.5,
        target: 108.0,
        quantity: 1,
        transactionType: 1,
        product: 1,
        orderType: 5,
        testingMode: false,
        currentDailyLoss: 305.0 // Exceeds ₹300 daily maximum
      }
    });

    expect(serverRes.status()).toBe(400);
    const body = await serverRes.json();
    expect(body.error).toMatch(/Daily circuit breaker tripped|insufficient/i);
  });

  test("Server Guard: Enforces maximum concurrent position limit of 1", async ({ request }) => {
    // 1. Rehydrate an active position directly into RMS
    const rehydrateRes = await request.post("http://127.0.0.1:5001/api/rms/positions/rehydrate", {
      data: {
        positionId: "pos_e2e_concurrent_test",
        symbol: "NIFTY26NOV24000CE",
        instrumentKey: "NSE_FO|54098",
        quantity: 1,
        entryPrice: 100.0,
        stopLoss: 96.5,
        target: 108.0,
        direction: "LONG"
      }
    });
    expect(rehydrateRes.ok()).toBeTruthy();

    // 2. Attempt to deploy a second concurrent order in standard live mode
    const order2 = await request.post("http://127.0.0.1:5001/api/orders/deploy", {
      data: {
        symbol: "NIFTY26NOV24100CE",
        instrumentKey: "NSE_FO|54099",
        price: 100.0,
        stopLoss: 96.5,
        target: 108.0,
        quantity: 1,
        transactionType: 1,
        product: 1,
        orderType: 5,
        testingMode: false
      }
    });

    expect(order2.status()).toBe(400);
    const body = await order2.json();
    expect(body.error).toMatch(/Maximum concurrent positions limit \(1\) reached/i);
  });

  test("Server Guard: Testing Mode does not bypass structural validation", async ({ request }) => {
    // 1. Zero or negative quantity must be rejected even in Testing Mode
    const qtyRes = await request.post("http://127.0.0.1:5001/api/orders/deploy", {
      data: {
        symbol: "NIFTY26NOV24000CE",
        instrumentKey: "NSE_FO|54098",
        price: 100.0,
        stopLoss: 50.0,
        target: 200.0,
        quantity: 0,
        transactionType: 1,
        testingMode: true
      }
    });
    expect(qtyRes.status()).toBe(400);
    const qtyBody = await qtyRes.json();
    expect(qtyBody.error).toMatch(/Quantity must be greater than zero/i);

    // 2. Zero or negative entry price must be rejected even in Testing Mode
    const priceRes = await request.post("http://127.0.0.1:5001/api/orders/deploy", {
      data: {
        symbol: "NIFTY26NOV24000CE",
        instrumentKey: "NSE_FO|54098",
        price: -10.0,
        stopLoss: 50.0,
        target: 200.0,
        quantity: 1,
        transactionType: 1,
        testingMode: true
      }
    });
    expect(priceRes.status()).toBe(400);
    const priceBody = await priceRes.json();
    expect(priceBody.error).toMatch(/Entry price must be greater than zero/i);

    // 3. Invalid or empty symbol must be rejected
    const symbolRes = await request.post("http://127.0.0.1:5001/api/orders/deploy", {
      data: {
        symbol: " ",
        instrumentKey: "NSE_FO|54098",
        price: 100.0,
        stopLoss: 50.0,
        target: 200.0,
        quantity: 1,
        transactionType: 1,
        testingMode: true
      }
    });
    expect(symbolRes.status()).toBe(400);
    const symBody = await symbolRes.json();
    expect(symBody.error).toMatch(/Invalid symbol/i);
  });
});
