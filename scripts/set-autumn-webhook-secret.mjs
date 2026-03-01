#!/usr/bin/env node
/**
 * Set AUTUMN_WEBHOOK_SECRET in Convex (for Autumn webhook verification).
 * Usage: node scripts/set-autumn-webhook-secret.mjs whsec_xxx
 * Get the secret from Autumn dashboard → Developer → Webhooks → your endpoint.
 */
import { execSync } from "child_process";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = __dirname + "/..";

const secret = process.argv[2] ?? process.env.AUTUMN_WEBHOOK_SECRET;
if (!secret || !secret.startsWith("whsec_")) {
  console.error("Usage: node scripts/set-autumn-webhook-secret.mjs whsec_xxx");
  console.error("Get the secret from Autumn dashboard → Developer → Webhooks.");
  process.exit(1);
}

execSync(`npx convex env set AUTUMN_WEBHOOK_SECRET ${secret}`, {
  cwd: repoRoot,
  stdio: "inherit",
});
console.log("Done. Autumn webhook will now credit balance on payment.");
