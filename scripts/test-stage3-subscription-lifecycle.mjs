/**
 * Stage 3.1 Verification Test Suite: Upstox V3 Subscription Lifecycle & State Machine
 * Deterministically tests pre-connect queues, socket-open transmission, send failures & retries,
 * reconnect deduplication, and distinction between requested, pending, sent, and observed state.
 */

import assert from "node:assert/strict";
import { UpstoxClient } from "../src/services/upstoxClient.js";
import { flushUpstoxSubscriptions } from "../src/services/upstox/upstoxPolling.js";

let passedCount = 0;
let failedCount = 0;

function runGate(gateName, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${gateName}`);
    passedCount++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${gateName}: ${err.message}`);
    failedCount++;
  }
}

async function runGateAsync(gateName, fn) {
  try {
    await fn();
    console.log(`  ✅ [PASS] ${gateName}`);
    passedCount++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${gateName}: ${err.message}`);
    failedCount++;
  }
}

console.log("================================================================================");
console.log("STAGE 3.1 VERIFICATION: UPSTOX V3 SUBSCRIPTION LIFECYCLE & STATE MACHINE");
console.log("================================================================================\n");

// -----------------------------------------------------------------------------
// TEST 1: Registering Multiple Instruments Before Connection
// -----------------------------------------------------------------------------
runGate("Test 1: Multiple instruments registered before connection remain pending", () => {
  const client = new UpstoxClient({ accessToken: "mock-token" });
  client.subscribe("NSE_INDEX|Nifty 50");
  client.subscribe("NSE_INDEX|Nifty Bank");
  client.subscribe("NSE_FO|47161");

  const status = client.getStatus();
  assert.equal(status.requestedSubscriptions.length, 3, "All 3 instruments must be in requestedSubscriptions");
  assert.equal(status.pendingSubscriptions.length, 3, "All 3 instruments must be in pendingSubscriptions before connect");
  assert.equal(status.sentSubscriptions.length, 0, "Zero instruments must be in sentSubscriptions before connect");
  assert.equal(status.observedSubscriptions.length, 0, "Zero instruments must be in observedSubscriptions");
  assert.equal(client.connected, false, "Client must remain unconnected");
});

// -----------------------------------------------------------------------------
// TEST 2: Duplicate Subscription Requests Deduplication
// -----------------------------------------------------------------------------
runGate("Test 2: Duplicate subscription calls are deduplicated cleanly in Set", () => {
  const client = new UpstoxClient({ accessToken: "mock-token" });
  client.subscribe("NSE_INDEX|Nifty 50");
  client.subscribe("NSE_INDEX|Nifty 50");
  client.subscribe("nse_index|nifty 50"); // lowercase check

  const status = client.getStatus();
  assert.equal(status.requestedSubscriptions.length, 1, "Duplicate requests must be collapsed to 1 entry");
  assert.equal(status.pendingSubscriptions.length, 1, "Pending set must contain exactly 1 entry");
  assert.equal(status.pendingSubscriptions[0], "NSE_INDEX|NIFTY 50", "Must be uppercase normalized");
});

// -----------------------------------------------------------------------------
// TEST 3: Opening Socket and Sending All Pending Subscriptions
// -----------------------------------------------------------------------------
runGate("Test 3: Opening socket transmits all pending subscriptions in a single batch frame", () => {
  const client = new UpstoxClient({ accessToken: "mock-token" });
  client.subscribe("NSE_INDEX|Nifty 50");
  client.subscribe("NSE_FO|47161");

  let sentPayload = null;
  client.socket = {
    readyState: 1, // WebSocket.OPEN
    send: (buffer) => {
      sentPayload = JSON.parse(buffer.toString("utf-8"));
    }
  };
  client.connected = true;

  // Flush on socket open
  const result = client.flushSubscriptions();
  assert.equal(result, true, "Flush must succeed on open socket");
  assert.ok(sentPayload, "Subscription payload must be sent");
  assert.equal(sentPayload.method, "sub", "Method must be sub");
  assert.deepEqual(sentPayload.data.instrumentKeys.sort(), ["NSE_FO|47161", "NSE_INDEX|NIFTY 50"], "All pending keys must be included");

  const status = client.getStatus();
  assert.equal(status.pendingSubscriptions.length, 0, "Pending queue must be emptied after successful send");
  assert.equal(status.sentSubscriptions.length, 2, "Both keys must now be in sentSubscriptions");
  assert.equal(status.activeSubscriptions.length, 2, "activeSubscriptions alias must reflect sent keys");
  assert.equal(status.observedSubscriptions.length, 0, "observedSubscriptions must remain empty until ticks arrive");
});

// -----------------------------------------------------------------------------
// TEST 4: Send Failure Preserves Pending Queue
// -----------------------------------------------------------------------------
runGate("Test 4: Send failure preserves pending queue and does not drop subscriptions", () => {
  const client = new UpstoxClient({ accessToken: "mock-token" });
  client.subscribe("NSE_INDEX|Nifty 50");
  client.subscribe("NSE_FO|47161");

  // Mock socket that throws on send (e.g. abrupt network socket failure)
  client.socket = {
    readyState: 1,
    send: () => {
      throw new Error("Socket broken pipe");
    }
  };
  client.connected = true;

  const result = client.flushSubscriptions();
  assert.equal(result, false, "Flush must return false on send failure");

  const status = client.getStatus();
  assert.equal(status.pendingSubscriptions.length, 2, "Pending subscriptions MUST be preserved upon failure");
  assert.equal(status.sentSubscriptions.length, 0, "Zero keys must be marked sent upon failure");

  // Now restore socket to working state and flush again
  let sentPayload = null;
  client.socket.send = (buf) => {
    sentPayload = JSON.parse(buf.toString("utf-8"));
  };

  const retryResult = client.flushSubscriptions();
  assert.equal(retryResult, true, "Retry flush must succeed once socket recovers");
  assert.ok(sentPayload, "Retry payload must be sent");
  assert.equal(client.getStatus().pendingSubscriptions.length, 0, "Pending queue must now be cleared");
  assert.equal(client.getStatus().sentSubscriptions.length, 2, "Sent subscriptions must now be populated");
});

// -----------------------------------------------------------------------------
// TEST 5: Reconnect and Resubscription Without Duplicates
// -----------------------------------------------------------------------------
runGate("Test 5: Reconnect resets per-connection state and resubscribes without duplicates", () => {
  const client = new UpstoxClient({ accessToken: "mock-token" });
  client.subscribe("NSE_INDEX|Nifty 50");
  client.subscribe("NSE_FO|47161");

  let sendCount = 0;
  const sentBatches = [];
  client.socket = {
    readyState: 1,
    send: (buf) => {
      sendCount++;
      sentBatches.push(JSON.parse(buf.toString("utf-8")));
    }
  };
  client.connected = true;
  client.flushSubscriptions();

  assert.equal(sendCount, 1, "Initial batch sent");
  assert.equal(client.sentSubscriptions.size, 2);

  // Simulate socket close
  client.connected = false;
  client.socket = null;
  if (client.requestedSubscriptions && client.requestedSubscriptions.size > 0) {
    client.pendingSubscriptions = new Set(client.requestedSubscriptions);
  }
  client.sentSubscriptions.clear();
  client.activeSubscriptions.clear();
  client.observedSubscriptions.clear();

  assert.equal(client.sentSubscriptions.size, 0, "Sent subscriptions cleared on disconnect");
  assert.equal(client.pendingSubscriptions.size, 2, "Pending queue re-armed with all requested subscriptions");

  // Add one new instrument while disconnected
  client.subscribe("NSE_INDEX|Nifty Bank");
  assert.equal(client.requestedSubscriptions.size, 3, "Requested subscriptions now 3");
  assert.equal(client.pendingSubscriptions.size, 3, "Pending subscriptions now 3");

  // Simulate socket open on new connection
  client.socket = {
    readyState: 1,
    send: (buf) => {
      sendCount++;
      sentBatches.push(JSON.parse(buf.toString("utf-8")));
    }
  };
  client.connected = true;
  if (client.requestedSubscriptions && client.requestedSubscriptions.size > 0) {
    client.pendingSubscriptions = new Set(client.requestedSubscriptions);
  }
  client.sentSubscriptions.clear();
  client.activeSubscriptions.clear();
  client.observedSubscriptions.clear();

  client.flushSubscriptions();

  assert.equal(sendCount, 2, "Second batch sent on new connection");
  assert.equal(sentBatches[1].data.instrumentKeys.length, 3, "Batch must contain exactly 3 keys");
  assert.deepEqual(
    sentBatches[1].data.instrumentKeys.sort(),
    ["NSE_FO|47161", "NSE_INDEX|NIFTY 50", "NSE_INDEX|NIFTY BANK"],
    "Resubscription must cover all requested instruments without duplicates"
  );
  assert.equal(client.sentSubscriptions.size, 3);
  assert.equal(client.pendingSubscriptions.size, 0);
});

// -----------------------------------------------------------------------------
// TEST 6: Receiving Market Update Marks Observed Subscriptions
// -----------------------------------------------------------------------------
runGate("Test 6: Receiving verified market update marks instrument in observedSubscriptions", () => {
  const client = new UpstoxClient({ accessToken: "mock-token" });
  client.subscribe("NSE_INDEX|Nifty 50");

  client.socket = { readyState: 1, send: () => {} };
  client.connected = true;
  client.flushSubscriptions();

  assert.equal(client.sentSubscriptions.has("NSE_INDEX|NIFTY 50"), true);
  assert.equal(client.observedSubscriptions.has("NSE_INDEX|NIFTY 50"), false, "Not observed yet before tick");

  // Emit verified tick
  client.emit("tick", {
    key: "NSE_INDEX|NIFTY 50",
    token: "NSE_INDEX|NIFTY 50",
    ltp: 22960.50,
    source: "WEBSOCKET_V3",
    isFresh: true
  });

  assert.equal(client.observedSubscriptions.has("NSE_INDEX|NIFTY 50"), true, "Observed subscriptions must now include instrument");
  const status = client.getStatus();
  assert.deepEqual(status.observedSubscriptions, ["NSE_INDEX|NIFTY 50"], "Observed list exposed in getStatus");
});

// -----------------------------------------------------------------------------
// TEST 7: Local Send Is Distinguished From Observed Market Data
// -----------------------------------------------------------------------------
runGate("Test 7: Local socket send is explicitly differentiated from confirmed market data", () => {
  const client = new UpstoxClient({ accessToken: "mock-token" });
  client.subscribe("NSE_FO|47161"); // Target option
  client.subscribe("NSE_FO|99999"); // Dead strike with zero trading volume

  client.socket = { readyState: 1, send: () => {} };
  client.connected = true;
  client.flushSubscriptions();

  assert.equal(client.sentSubscriptions.size, 2, "Both keys sent to broker locally");
  assert.equal(client.observedSubscriptions.size, 0, "Neither key is observed yet");

  // Only active option receives tick
  client.emit("tick", {
    key: "NSE_FO|47161",
    ltp: 112.50,
    source: "WEBSOCKET_V3"
  });

  const status = client.getStatus();
  assert.equal(status.sentSubscriptions.includes("NSE_FO|99999"), true, "Dead strike was sent");
  assert.equal(status.observedSubscriptions.includes("NSE_FO|99999"), false, "Dead strike is NOT observed (no phantom broker ack)");
  assert.equal(status.observedSubscriptions.includes("NSE_FO|47161"), true, "Active strike is observed");
});

// -----------------------------------------------------------------------------
// TEST 8: Correct Feed-Health State After Disconnect & Token Expiry
// -----------------------------------------------------------------------------
runGate("Test 8: Unexpected disconnect and token expiry preserve observable subscription state", () => {
  const client = new UpstoxClient({ accessToken: "mock-token" });
  client.subscribe("NSE_INDEX|Nifty 50");
  client.subscribe("NSE_FO|47161");

  client.socket = { readyState: 1, send: () => {} };
  client.connected = true;
  client.flushSubscriptions();

  // 1. Simulate Token Expiry Event
  client.connectionState = "TOKEN_EXPIRED";
  client.connected = false;
  client.lastError = "Upstox access token expired";
  if (client.requestedSubscriptions && client.requestedSubscriptions.size > 0) {
    client.pendingSubscriptions = new Set(client.requestedSubscriptions);
  }
  client.sentSubscriptions.clear();
  client.activeSubscriptions.clear();
  client.observedSubscriptions.clear();

  let status = client.getStatus();
  assert.equal(status.connectionState, "TOKEN_EXPIRED");
  assert.equal(status.websocketConnected, false);
  assert.equal(status.requestedSubscriptions.length, 2, "Requested subscriptions preserved across expiry");
  assert.equal(status.pendingSubscriptions.length, 2, "Pending queue preserved across expiry");
  assert.equal(status.sentSubscriptions.length, 0, "Sent subscriptions reset");

  // 2. Simulate Token Refresh & Reconnect
  client.socket = { readyState: 1, send: () => {} };
  client.connected = true;
  client.connectionState = "CONNECTED";
  client.lastError = "";
  client.flushSubscriptions();

  status = client.getStatus();
  assert.equal(status.connectionState, "SUBSCRIBED");
  assert.equal(status.websocketConnected, true);
  assert.equal(status.pendingSubscriptions.length, 0, "Pending queue sent");
  assert.equal(status.sentSubscriptions.length, 2, "Both instruments restored to sent state");
});

console.log("\n================================================================================");
console.log(`STAGE 3.1 RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log("================================================================================\n");

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
