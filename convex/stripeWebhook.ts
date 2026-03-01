import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

/** Verify Stripe webhook signature (t=timestamp,v1=sig -> HMAC-SHA256(secret, t + "." + body)). */
async function verifyStripeSignature(
  secret: string,
  rawBody: string,
  signatureHeader: string
): Promise<boolean> {
  const parts: Record<string, string> = {};
  for (const part of signatureHeader.split(",")) {
    const [k, v] = part.split("=");
    if (k && v) parts[k.trim()] = v.trim();
  }
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  const timestamp = parseInt(t, 10);
  if (Number.isNaN(timestamp)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 300) return false; // 5 min tolerance
  const signedPayload = t + "." + rawBody;
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
    new TextEncoder().encode(signedPayload)
  );
  const hex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (hex.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

/**
 * Stripe webhook: on checkout.session.completed, credit user balance by customer email.
 * Set STRIPE_WEBHOOK_SECRET (whsec_...) in Convex env.
 */
export const stripeWebhook = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("Stripe-Signature") ?? "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  if (!secret || !(await verifyStripeSignature(secret, rawBody, signature))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const session = event.data?.object as {
    amount_total?: number | null;
    customer_details?: { email?: string | null };
    customer_email?: string | null;
  };
  const amountCents = session?.amount_total ?? 0;
  const amountDollars = amountCents / 100;
  const email =
    session?.customer_details?.email ?? session?.customer_email ?? "";
  if (amountDollars <= 0 || !email) {
    return new Response(
      JSON.stringify({ received: true, skipped: "no amount or email" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  await ctx.runMutation(internal.users.addToBalanceByEmail, {
    email: email.trim().toLowerCase(),
    amount: Math.round(amountDollars * 100) / 100,
  });

  return new Response(
    JSON.stringify({ received: true, credited: email }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
