import fs from "node:fs";

const file = "src/client/components/trading/order-pad/hooks/orderPadCalculations.js";
let content = fs.readFileSync(file, "utf8");

// Add import if not present
if (!content.includes("calculateStatutoryCharges")) {
  content = `import { calculateStatutoryCharges } from "../../../../stores/slices/tradeHelpers.js";\n` + content;
}

const target = `  const qty = Number(totalQty) > 0 ? Number(totalQty) : 65;
  const statutoryFrictionEstimate = 55.20;
  const slippageDragRupees = adverseSlippageAllowance * qty;`;

const replacement = `  const qty = Number(totalQty) > 0 ? Number(totalQty) : 65;
  const statutoryFrictionEstimate = entry > 0 ? calculateStatutoryCharges(entry, entry, qty, "LONG") : 55.20;
  const slippageDragRupees = adverseSlippageAllowance * qty;`;

const normContent = content.replace(/\r\n/g, "\n");
const normTarget = target.replace(/\r\n/g, "\n");
const normReplacement = replacement.replace(/\r\n/g, "\n");

if (normContent.includes(normTarget)) {
  fs.writeFileSync(file, normContent.replace(normTarget, normReplacement).replace(/\n/g, "\r\n"), "utf8");
  console.log("✅ Dynamically wired calculateStatutoryCharges in calculateRiskRewardTargets");
} else {
  console.error("❌ Target not found");
}
