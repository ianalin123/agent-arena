#!/usr/bin/env node
/**
 * Get an Autumn Add funds checkout URL (for testing).
 * Usage: node scripts/test-autumn-checkout.mjs [customerId] [amountDollars]
 * Example: node scripts/test-autumn-checkout.mjs my-user-id 10
 * If no args: uses customerId "test" and amount 5.
 */
import { execSync } from "child_process";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = __dirname + "/..";

const customerId = process.argv[2] ?? process.env.CUSTOMER_ID ?? "test";
const amount = parseFloat(process.argv[3] ?? process.env.AMOUNT ?? "5") || 5;

const args = JSON.stringify({
  customerId,
  amountDollars: amount,
});

try {
  const out = execSync(
    `npx convex run autumnCheckout:createAddFundsCheckout '${args}'`,
    { cwd: repoRoot, encoding: "utf8" }
  );
  const data = JSON.parse(out.trim());
  if (data.url) {
    console.log("Checkout URL:\n", data.url);
    console.log("\nOpen in browser to complete test payment.");
  } else {
    console.log(out);
  }
} catch (e) {
  console.error(e.stdout?.toString() || e.message);
  process.exit(1);
}
