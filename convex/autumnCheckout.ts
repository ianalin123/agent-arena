import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { v } from "convex/values";

const AUTUMN_API = "https://api.useautumn.com/v1";

/**
 * Diagnostic: fetch the add_funds product from Autumn to inspect plan/price config.
 * Run: npx convex run autumnCheckout:getAutumnProduct
 */
export const getAutumnProduct = action({
  args: {},
  handler: async () => {
    const secretKey = process.env.AUTUMN_SECRET_KEY;
    const productId = process.env.AUTUMN_ADD_FUNDS_PRODUCT_ID ?? "add_funds";
    if (!secretKey) throw new Error("AUTUMN_SECRET_KEY not set");
    const res = await fetch(`${AUTUMN_API}/products/${productId}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, status: res.status, body: text };
    }
    try {
      return { ok: true, product: JSON.parse(text) as Record<string, unknown> };
    } catch {
      return { ok: true, raw: text };
    }
  },
});

/**
 * Create an Autumn checkout for "Add funds" (variable amount in USD).
 * Returns the Stripe Checkout URL to redirect the user.
 * Requires AUTUMN_SECRET_KEY and AUTUMN_ADD_FUNDS_PRODUCT_ID in Convex env.
 */
export const createAddFundsCheckout = action({
  args: {
    customerId: v.string(),
    amountDollars: v.number(),
    successUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const secretKey = process.env.AUTUMN_SECRET_KEY;
    const productId =
      process.env.AUTUMN_ADD_FUNDS_PRODUCT_ID ?? "add_funds";
    if (!secretKey) {
      throw new Error(
        "Autumn not configured: set AUTUMN_SECRET_KEY in Convex env"
      );
    }
    if (args.amountDollars < 1) {
      throw new Error("Minimum add funds amount is $1");
    }
    // API expects integer quantity for prepaid (see docs.useautumn.com/examples/prepaid)
    const quantity = Math.round(args.amountDollars);
    const body: Record<string, unknown> = {
      customer_id: args.customerId,
      product_id: productId,
      options: [{ feature_id: "usd_credits", quantity }],
      // Workaround: Autumn sometimes doesn't attach a Stripe price for credit_system prepaid.
      // Pass line_items with price_data so Stripe gets a valid line item (Autumn still grants credits from options).
      checkout_session_params: {
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: 100, // $1 per unit in cents
              product_data: {
                name: "USD Credits (Add funds)",
                description: `${quantity} USD credit${quantity !== 1 ? "s" : ""} for Agent Arena`,
              },
            },
            quantity,
          },
        ],
      },
    };
    if (args.successUrl) body.success_url = args.successUrl;

    const res = await fetch(`${AUTUMN_API}/checkout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Autumn checkout failed: ${res.status} ${err}`);
    }

    const data = (await res.json()) as { url?: string };
    if (!data?.url) throw new Error("No checkout URL in Autumn response");
    return { url: data.url };
  },
});

/**
 * Sync Convex user balance from Autumn (no webhook needed).
 * Call this when the user returns from checkout (e.g. success URL) or when showing balance.
 * GETs Autumn customer balances and credits any new usd_credits to the user.
 */
export const syncBalanceFromAutumn = action({
  args: {
    customerId: v.string(),
  },
  handler: async (ctx, args) => {
    const secretKey = process.env.AUTUMN_SECRET_KEY;
    if (!secretKey) return;
    const res = await fetch(
      `${AUTUMN_API}/customers/${encodeURIComponent(args.customerId)}`,
      {
        headers: { Authorization: `Bearer ${secretKey}` },
      }
    );
    if (!res.ok) return;
    const data = (await res.json()) as {
      balances?: Record<string, { current_balance?: number }>;
    };
    const balance =
      typeof data?.balances?.usd_credits?.current_balance === "number"
        ? data.balances.usd_credits.current_balance
        : 0;
    if (balance <= 0) return;
    await ctx.runMutation(internal.users.syncAutumnBalance, {
      userId: args.customerId as import("./_generated/dataModel").Id<"users">,
      autumnCurrentBalance: balance,
    });
  },
});
