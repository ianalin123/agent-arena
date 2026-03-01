import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ArrayToBase64(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary);
}

async function verifySvix(
  secret: string,
  body: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string
): Promise<boolean> {
  const secretBase64 = secret.replace(/^whsec_/, "");
  const secretBytes = base64ToUint8Array(secretBase64);
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signedContent = `${svixId}.${svixTimestamp}.${body}`;
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedContent)
  );
  const expectedSig = uint8ArrayToBase64(sigBuffer);
  const parts = svixSignature.split(/[\s,]+/).filter(Boolean);
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const comma = p.indexOf(",");
    if (comma === -1) continue;
    const ver = p.slice(0, comma);
    const sig = p.slice(comma + 1);
    if (ver === "v1" && sig.length === expectedSig.length) {
      let diff = 0;
      for (let j = 0; j < sig.length; j++) diff |= sig.charCodeAt(j) ^ expectedSig.charCodeAt(j);
      if (diff === 0) return true;
    }
  }
  return false;
}

/**
 * Autumn webhook (Svix). When Autumn sends customer.products.updated (e.g. scenario "new"),
 * credit the Convex user whose id matches customer.id.
 * Set AUTUMN_WEBHOOK_SECRET (whsec_...) in Convex env.
 */
export const autumnWebhook = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await request.text();
  const svixId = request.headers.get("svix-id") ?? "";
  const svixTimestamp = request.headers.get("svix-timestamp") ?? "";
  const svixSignature = request.headers.get("svix-signature") ?? "";
  const secret = process.env.AUTUMN_WEBHOOK_SECRET ?? "";

  if (secret && svixId && svixTimestamp && svixSignature) {
    const ts = parseInt(svixTimestamp, 10);
    if (!Number.isNaN(ts) && Math.abs(Date.now() / 1000 - ts) > 300) {
      return new Response("Timestamp out of range", { status: 400 });
    }
    const ok = await verifySvix(secret, rawBody, svixId, svixTimestamp, svixSignature);
    if (!ok) {
      return new Response("Invalid signature", { status: 401 });
    }
  }

  let payload: { type?: string; data?: { scenario?: string; customer?: { id?: string }; updated_product?: { items?: Array<{ price?: number; amount?: number }> }; total?: number } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (payload?.type !== "customer.products.updated" || payload?.data?.scenario !== "new") {
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const customerId = payload?.data?.customer?.id;
  if (!customerId) {
    return new Response(JSON.stringify({ received: true, skipped: "no customer id" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const total = payload?.data?.total ?? payload?.data?.updated_product?.items?.[0]?.amount ?? payload?.data?.updated_product?.items?.[0]?.price ?? 0;
  const amountDollars = typeof total === "number" ? total / 100 : 0;
  if (amountDollars <= 0) {
    return new Response(JSON.stringify({ received: true, skipped: "no amount" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  await ctx.runMutation(internal.users.addToBalance, {
    userId: customerId as any,
    amount: Math.round(amountDollars * 100) / 100,
  });

  return new Response(JSON.stringify({ received: true, credited: customerId }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
