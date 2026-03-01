import { action } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a Stripe Checkout session for "Add funds" (variable amount).
 * Returns the checkout URL. When the customer pays, Stripe sends checkout.session.completed
 * to our /stripe-webhook, which credits the user's balance by email (customer_email must
 * match a Convex user's email).
 * Requires STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET (for webhook) in Convex env.
 */
export const createCheckout = action({
  args: {
    amountDollars: v.number(),
    successUrl: v.string(),
    cancelUrl: v.string(),
    customerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("Stripe not configured: set STRIPE_SECRET_KEY in Convex env");
    }
    if (args.amountDollars < 1) {
      throw new Error("Minimum amount is $1");
    }
    const amountCents = Math.round(args.amountDollars * 100);

    const body = new URLSearchParams({
      mode: "payment",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(amountCents),
      "line_items[0][price_data][product_data][name]": "Add funds (Agent Arena)",
      "line_items[0][quantity]": "1",
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
    });
    if (args.customerEmail?.trim()) {
      body.set("customer_email", args.customerEmail.trim());
    }

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Stripe checkout failed: ${res.status} ${text}`);
    }

    const data = (await res.json()) as { url?: string };
    if (!data?.url) throw new Error("No checkout URL in Stripe response");
    return { url: data.url };
  },
});
