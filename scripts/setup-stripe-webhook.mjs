#!/usr/bin/env node
/**
 * Creates the Stripe webhook endpoint and sets STRIPE_WEBHOOK_SECRET in Convex.
 * Run once with your Stripe secret key (from Dashboard → Developers → API keys).
 *
 *   STRIPE_SECRET_KEY=sk_live_xxx node scripts/setup-stripe-webhook.mjs
 *
 * Optional: CONVEX_WEBHOOK_URL (default: https://fantastic-falcon-990.convex.site/stripe-webhook)
 */

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

function getWebhookUrl() {
  if (process.env.CONVEX_WEBHOOK_URL) return process.env.CONVEX_WEBHOOK_URL;
  const envPath = join(repoRoot, "apps", "web", ".env.local");
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf8");
    const m = content.match(/NEXT_PUBLIC_CONVEX_URL=(.+)/);
    if (m) {
      const url = m[1].trim();
      const base = url.replace(/\.convex\.cloud\/?$/, ".convex.site");
      return `${base.replace(/\/$/, "")}/stripe-webhook`;
    }
  }
  return "https://fantastic-falcon-990.convex.site/stripe-webhook";
}

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey || !(secretKey.startsWith("sk_") || secretKey.startsWith("rk_"))) {
  console.error("Set STRIPE_SECRET_KEY (sk_... or rk_...) in the environment.");
  process.exit(1);
}

const webhookUrl = getWebhookUrl();
console.log("Webhook URL:", webhookUrl);

const body = new URLSearchParams({
  url: webhookUrl,
  "enabled_events[]": "checkout.session.completed",
  description: "Agent Arena – credit balance on payment",
});

const res = await fetch("https://api.stripe.com/v1/webhook_endpoints", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: body.toString(),
});

if (!res.ok) {
  const text = await res.text();
  console.error("Stripe API error:", res.status, text);
  process.exit(1);
}

const data = await res.json();
const whsec = data.secret;
if (!whsec) {
  console.error("No secret in response:", JSON.stringify(data, null, 2));
  process.exit(1);
}

console.log("Webhook endpoint created. Setting STRIPE_WEBHOOK_SECRET in Convex...");
execSync(`npx convex env set STRIPE_WEBHOOK_SECRET ${whsec}`, {
  cwd: repoRoot,
  stdio: "inherit",
});
console.log("Done. Stripe payments will now credit user balance by email.");
console.log("");
console.log("To accept REAL payments (live mode), run these two commands with your LIVE key (sk_live_...):");
console.log("  1. npx convex env set STRIPE_SECRET_KEY sk_live_xxx");
console.log("  2. STRIPE_SECRET_KEY=sk_live_xxx node scripts/setup-stripe-webhook.mjs");
console.log("(Get the live key from Stripe Dashboard → switch to Live mode → Developers → API keys.)");
