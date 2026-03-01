#!/usr/bin/env node
/**
 * Set all Lemon Squeezy Convex env vars in one go.
 * Usage:
 *   node scripts/set-lemonsqueezy-env.mjs <API_KEY> <STORE_ID> <VARIANT_ID> <WEBHOOK_SECRET>
 * Or set env and run with no args:
 *   LEMON_SQUEEZY_API_KEY=... LEMON_SQUEEZY_STORE_ID=... LEMON_SQUEEZY_VARIANT_ID=... LEMON_SQUEEZY_WEBHOOK_SECRET=... node scripts/set-lemonsqueezy-env.mjs
 *
 * Get these from Lemon Squeezy: Dashboard → Settings → API (key); Stores (store id); Product → variant id; Webhooks → Add webhook → Generate signing secret.
 * Webhook URL: https://<your-deployment>.convex.site/lemonsqueezy-webhook — Events: order_created.
 */
import { execSync } from "child_process";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = __dirname + "/..";

const apiKey = process.argv[2] ?? process.env.LEMON_SQUEEZY_API_KEY;
const storeId = process.argv[3] ?? process.env.LEMON_SQUEEZY_STORE_ID;
const variantId = process.argv[4] ?? process.env.LEMON_SQUEEZY_VARIANT_ID;
const webhookSecret = process.argv[5] ?? process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

if (!apiKey || !storeId || !variantId || !webhookSecret) {
  console.error("Usage: node scripts/set-lemonsqueezy-env.mjs <API_KEY> <STORE_ID> <VARIANT_ID> <WEBHOOK_SECRET>");
  console.error("Or set LEMON_SQUEEZY_API_KEY, LEMON_SQUEEZY_STORE_ID, LEMON_SQUEEZY_VARIANT_ID, LEMON_SQUEEZY_WEBHOOK_SECRET and run with no args.");
  process.exit(1);
}

const vars = [
  ["LEMON_SQUEEZY_API_KEY", apiKey],
  ["LEMON_SQUEEZY_STORE_ID", String(storeId)],
  ["LEMON_SQUEEZY_VARIANT_ID", String(variantId)],
  ["LEMON_SQUEEZY_WEBHOOK_SECRET", webhookSecret],
];
for (const [name, value] of vars) {
  execSync(`npx convex env set ${name} ${value}`, {
    cwd: repoRoot,
    stdio: "inherit",
  });
}
console.log("Done. Lemon Squeezy checkout and webhook are configured.");
