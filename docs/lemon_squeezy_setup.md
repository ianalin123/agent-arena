# Lemon Squeezy setup for Agent Arena

Use Lemon Squeezy so people can **deposit USD** (card/bank) into a shared “pot” and bet on agents. The platform (you) controls one Lemon Squeezy store; everyone pays into it, and you credit their in-app balance when payment succeeds. Payouts to users can be added later.

---

## 1. Create a Lemon Squeezy account and store

1. Go to [lemonsqueezy.com](https://lemonsqueezy.com) and sign up (no company/tax docs required like Stripe).
2. Create a **Store**: Dashboard → **Stores** → **New store**. Name it e.g. “Agent Arena”. This store is your single “bank” — all deposits go here.
3. Note your **Store ID** (numeric, e.g. `12345`). You’ll need it for the API.

---

## 2. Create a “Add funds” product and variant

1. In the store: **Products** → **New product**.
2. **Name:** e.g. “Add funds to balance”  
   **Description:** e.g. “Deposit USD to your Agent Arena balance to bet on agents.”
3. **Pricing:** Choose **One-time payment**. Set a **default price** (e.g. $10) — we’ll override it per checkout with a custom amount via the API.
4. Save the product. Open it and note:
   - **Product ID** (numeric)
   - **Variant ID** (numeric, usually one “Default” variant) — the API needs the **variant** for checkouts.

---

## 3. Get API key and create a webhook

1. **API key:** Dashboard → **Settings** → **API**. Create an API key. Copy it (starts with something like your store domain; keep it secret).
2. **Webhook:**
   - **Settings** → **Webhooks** → **Add webhook**.
   - **URL:** Your Convex HTTP endpoint:
     - `https://<your-convex-deployment>.convex.site/lemonsqueezy-webhook`
     - To find the deployment URL: Convex dashboard → your project → **Settings** → **URL**; the HTTP base is usually `https://<deployment>.convex.site`.
   - **Signing secret:** Click “Generate” and copy the secret (you’ll put it in Convex env as `LEMON_SQUEEZY_WEBHOOK_SECRET`).
   - **Events:** Subscribe at least to **`order_created`** (for one-time deposits). Optionally `order_refunded` if you’ll handle refunds later.
   - Save.

---

## 4. Convex environment variables

In Convex dashboard → **Settings** → **Environment Variables**, add:

| Variable | Description |
|----------|-------------|
| `LEMON_SQUEEZY_API_KEY` | Your Lemon Squeezy API key (from step 3). |
| `LEMON_SQUEEZY_STORE_ID` | Store ID (numeric string, e.g. `"12345"`). |
| `LEMON_SQUEEZY_VARIANT_ID` | Variant ID for “Add funds” (numeric string, e.g. `"67890"`). |
| `LEMON_SQUEEZY_WEBHOOK_SECRET` | Webhook signing secret (from step 3). |

Redeploy or run `npx convex dev` so the functions see the new env.

---

## 5. Flow summary

- **Deposit:** User clicks “Add funds”, enters amount (e.g. $25). App calls Convex action `lemonsqueezy.createDepositCheckout` with `amountCents` and `userId`. Action calls Lemon Squeezy API to create a checkout with that custom price and `custom_data: { user_id: userId }`, then returns the checkout URL. User is redirected to Lemon Squeezy, pays; Lemon Squeezy sends `order_created` to your webhook.
- **Webhook:** Convex HTTP action receives the request, verifies `X-Signature` with the webhook secret, parses `order_created`, reads `meta.custom_data.user_id` and `data.attributes.total_usd` (cents). It then runs an internal mutation to add `total_usd / 100` dollars to that user’s balance.
- **Betting:** Unchanged: users place bets from their balance; settlement and 5% take are already in Convex.

So: **one Lemon Squeezy store = one place everyone pays into; the platform (agent/system) has full control** over crediting balances and running the betting logic.

---

## 6. Optional: Test mode

Lemon Squeezy has a **Test mode** toggle in the dashboard. Use it to run test purchases without real money. When creating the checkout via API you can pass `test_mode: true`; the webhook payload will include `test_mode: true` so you can avoid crediting real balance in production if you want.

---

## 7. Frontend: “Add funds” flow

- Get the current user’s Convex `userId` (e.g. from auth or `useQuery(api.users.getByEmail, { email })`).
- When the user enters an amount (e.g. $25) and clicks “Add funds”, call the Convex action and redirect to the returned URL:

```ts
import { useAction } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/types";

// In your component:
const createDepositCheckout = useAction(api.lemonsqueezy.createDepositCheckout);

async function handleAddFunds(amountDollars: number, userId: Id<"users">) {
  const amountCents = Math.round(amountDollars * 100);
  const { url } = await createDepositCheckout({
    amountCents,
    userId,
    redirectUrl: `${window.location.origin}/sandbox`, // or your post-payment page
  });
  window.location.href = url;
}
```

- After the customer pays on Lemon Squeezy, they are redirected to `redirectUrl`. The webhook runs in the background and credits their balance; refresh or re-query the user to show the new balance.

## 8. Payouts

Not implemented yet; you can add later (e.g. manual sends, or Lemon Squeezy / other payout options when available).
