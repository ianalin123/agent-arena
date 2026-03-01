#!/usr/bin/env node
/**
 * Set AUTUMN_SECRET_KEY in Convex (required for Add funds via Autumn).
 * Usage: node scripts/set-autumn-secret-key.mjs am_sk_xxx
 *   or:  AUTUMN_SECRET_KEY=am_sk_xxx node scripts/set-autumn-secret-key.mjs
 */
import { execSync } from "child_process";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = __dirname + "/..";

const secret = process.argv[2] ?? process.env.AUTUMN_SECRET_KEY;
if (!secret || !secret.startsWith("am_sk_")) {
  console.error("Usage: node scripts/set-autumn-secret-key.mjs am_sk_xxx");
  console.error("Get your secret key from Autumn dashboard → Developer → API Keys.");
  process.exit(1);
}

execSync(`npx convex env set AUTUMN_SECRET_KEY ${secret}`, {
  cwd: repoRoot,
  stdio: "inherit",
});
console.log("Done. Autumn Add funds will use this key.");
