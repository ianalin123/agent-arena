import { action, httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const LEMON_SQUEEZY_API = "https://api.lemonsqueezy.com/v1";

/** Verify Lemon Squeezy webhook signature (HMAC-SHA256 hex) using Web Crypto. */
async function verifySignature(
  secret: string,
  rawBody: string,
  signature: string
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(rawBody)
  );
  const hex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (hex.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++)
    diff |= hex.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

/**
 * Create a one-time checkout for "Add funds". Returns the checkout URL to redirect the user.
 * Requires LEMON_SQUEEZY_API_KEY, LEMON_SQUEEZY_STORE_ID, LEMON_SQUEEZY_VARIANT_ID in env.
 */
export const createDepositCheckout = action({
  args: {
    amountCents: v.number(),
    userId: v.string(),
    redirectUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
    const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
    const variantId = process.env.LEMON_SQUEEZY_VARIANT_ID;
    if (!apiKey || !storeId || !variantId) {
      throw new Error("Lemon Squeezy not configured: set LEMON_SQUEEZY_API_KEY, STORE_ID, VARIANT_ID");
    }
    if (args.amountCents < 100) {
      throw new Error("Minimum amount is 100 cents ($1)");
    }

    const body = {
      data: {
        type: "checkouts",
        attributes: {
          custom_price: args.amountCents,
          product_options: {
            redirect_url: args.redirectUrl ?? undefined,
          },
          checkout_data: {
            custom: {
              user_id: args.userId,
            },
          },
        },
        relationships: {
          store: { data: { type: "stores", id: storeId } },
          variant: { data: { type: "variants", id: variantId } },
        },
      },
    };

    const res = await fetch(`${LEMON_SQUEEZY_API}/checkouts`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Lemon Squeezy checkout failed: ${res.status} ${err}`);
    }

    const data = (await res.json()) as {
      data?: { attributes?: { url?: string } };
    };
    const url = data?.data?.attributes?.url;
    if (!url) throw new Error("No checkout URL in response");
    return { url };
  },
});

/**
 * Webhook handler for Lemon Squeezy. Verify X-Signature, then on order_created credit user balance.
 * Requires LEMON_SQUEEZY_WEBHOOK_SECRET in env.
 */
export const lemonSqueezyWebhook = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("X-Signature") ?? "";
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET ?? "";
  if (!secret || !(await verifySignature(secret, rawBody, signature))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: {
    meta?: { event_name?: string; custom_data?: Record<string, string> };
    data?: {
      attributes?: {
        status?: string;
        total_usd?: number;
        test_mode?: boolean;
      };
    };
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const eventName = payload?.meta?.event_name;
  if (eventName !== "order_created") {
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const attrs = payload?.data?.attributes;
  const status = attrs?.status;
  if (status !== "paid") {
    return new Response(JSON.stringify({ received: true, skipped: "not paid" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const totalUsdCents = attrs?.total_usd ?? 0;
  const amountDollars = totalUsdCents / 100;
  if (amountDollars <= 0) {
    return new Response(JSON.stringify({ received: true, skipped: "no amount" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const customData = payload?.meta?.custom_data ?? {};
  const userId = customData.user_id;
  if (!userId) {
    return new Response(JSON.stringify({ received: true, skipped: "no user_id" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  await ctx.runMutation(internal.users.addToBalance, {
    userId: userId as any,
    amount: Math.round(amountDollars * 100) / 100,
  });

  return new Response(JSON.stringify({ received: true, credited: userId }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
