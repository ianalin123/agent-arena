# Stripe Integration for Agent Arena

## What Stripe Does Here

- **Deposits (you need this first)**  
  Users pay real money (card/bank) to add funds to their in-app balance. That balance is used to place bets. Stripe **Checkout** or **Payment Intents** accept the payment; your backend credits the user’s `balance` in Convex after payment succeeds.

- **After an event**  
  When a sandbox completes, we **settle** the pool: winners get a share of the **prize pool**, and the platform keeps **5%** of that pool. Losers get nothing. Payouts are reflected as in-app balance (and optionally paid out via Stripe later).

- **Paying people back**  
  - **Refunds (event cancelled / no result):** We already support this in Convex: everyone gets their stake back (full refund, no platform take).  
  - **Winnings:** Winners receive their share (95% of pool) as in-app balance.  
  - **Withdrawals (later):** When you’re ready, you can add “Withdraw” so users send balance to their bank/card via Stripe (payouts or Connect).

So for now: **Stripe = “humans transfer money in.”** Redistribution and refunds are handled in Convex (with 5% take on settlement). Real payouts to bank/card can be added once deposits work.

---

## What You Need To Do On Your End

### 1. Stripe account and keys

- Sign up at [dashboard.stripe.com](https://dashboard.stripe.com).
- Get API keys: **Developers → API keys**.
  - **Publishable key** (e.g. `pk_test_...`): safe to use in the frontend for Stripe.js / Checkout.
  - **Secret key** (e.g. `sk_test_...`): use only on the backend (Convex HTTP actions or a small Node server). Never put this in the frontend or in git.
- When you’re ready for live money, switch to **live** keys (`pk_live_...`, `sk_live_...`).

### 2. Webhook (so we know when payment succeeded)

- **Developers → Webhooks → Add endpoint**.
- Endpoint URL: your backend URL that can receive POSTs from Stripe (e.g. a Convex HTTP action or a Next.js API route).
- Events to subscribe to (minimum):
  - `checkout.session.completed` (if using Checkout), or  
  - `payment_intent.succeeded` (if using Payment Intents).
- Stripe will give you a **webhook signing secret** (e.g. `whsec_...`). Store it in env (e.g. `STRIPE_WEBHOOK_SECRET`) and use it to verify that the request really came from Stripe before crediting balance.

### 3. Where to put the secret key

- **Option A – Convex:** Use a Convex HTTP action as the Stripe webhook endpoint and call Stripe from there (with `sk_` in Convex env). Then you can credit `users.balance` inside the same Convex action.
- **Option B – Next.js:** Use a Next.js API route (e.g. `app/api/stripe/webhook/route.ts`) that verifies the webhook and then calls a Convex mutation to credit the user’s balance. Put `sk_` and `whsec_` in `apps/web/.env.local` (and never commit them).

### 4. Create a “deposit” product (optional but clear)

- In Stripe Dashboard: **Products → Add product**.
- e.g. name: “Agent Arena – Add funds”, one-time payment.
- You can use a fixed **Price** (e.g. $10) or let the user choose amount in your UI and create the Payment Intent/Checkout session with that amount in cents.

### 5. Flow you’re aiming for

1. User clicks “Add funds” and enters an amount (or selects a preset).
2. Frontend creates a Checkout session or Payment Intent (using publishable key / Stripe.js).
3. User pays on Stripe’s page (or your custom form).
4. Stripe sends a webhook to your endpoint when payment succeeds.
5. Your backend verifies the webhook (signing secret), then runs a Convex mutation that credits the correct user’s `balance` by the paid amount.
6. User can then place bets with that balance; settlement and refunds (and 5% take) are already handled in Convex.

---

## 5% Platform Take (implemented)

- On **settlement** (agent succeeds or fails, or pool expires), the **prize pool** is the total of all bets. We take **5%** of that; **95%** is distributed to winners (same proportions as before, but from the 95% pool).
- On **refund** (event cancelled / no result), users get **100%** of their stake back; no platform take.
- Platform revenue can be stored in Convex (e.g. a `platformRevenue` table or a field on a “house” account) and withdrawn from your Stripe balance to your bank on your schedule.

---

## When You Have API Keys

Add them to env (never commit):

- **Convex (if you use HTTP action for webhook):**  
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (and optionally `STRIPE_PUBLISHABLE_KEY` if you need it server-side).
- **Next.js (if you use API route):**  
  In `apps/web/.env.local`:  
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (for Checkout redirect or Stripe.js).

Then we can add:

1. **Deposit flow:** “Add funds” → Stripe Checkout or Payment Intents → webhook → Convex mutation to update `users.balance`.
2. **Optional:** “Withdraw” button that creates a Stripe payout or Connect transfer to the user’s bank (later phase).

---

## Summary

| Your task | Purpose |
|-----------|--------|
| Stripe account + publishable + secret key | Accept payments and verify webhooks |
| Webhook endpoint (Convex HTTP or Next.js route) | Know when a deposit succeeded and credit the right user |
| Webhook signing secret in env | Security: only Stripe can trigger balance updates |
| (Optional) Product/Price in Dashboard | Clear bookkeeping and consistent amounts |

Redistribution to winners and refunds are handled in the app (Convex) with a **5% platform take on settlement**; Stripe’s job in v1 is to **get money in**. Payouts to users’ bank accounts can be added once this is working.
