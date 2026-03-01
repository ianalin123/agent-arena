#!/usr/bin/env node
/**
 * Set AUTUMN_ADD_FUNDS_PRODUCT_ID in Convex (if your Autumn product ID is not "add_funds").
 * Usage: node scripts/set-autumn-product-id.mjs your_product_id
 */
import { execSync } from "child_process";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = __dirname + "/..";

const productId = process.argv[2] ?? process.env.AUTUMN_ADD_FUNDS_PRODUCT_ID;
if (!productId) {
  console.error("Usage: node scripts/set-autumn-product-id.mjs <product_id>");
  console.error('Default is "add_funds". Only run this if your Autumn product has a different ID.');
  process.exit(1);
}

execSync(`npx convex env set AUTUMN_ADD_FUNDS_PRODUCT_ID ${productId}`, {
  cwd: repoRoot,
  stdio: "inherit",
});
console.log("Done. Add funds checkout will use product:", productId);
