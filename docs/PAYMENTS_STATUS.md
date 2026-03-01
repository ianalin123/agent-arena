# Payments & billing – what works and what doesn't

Quick reference so you can see what's functional and whether the rest matters for you.

---

## ✅ Working (code in place and used)

| Part | Status | Notes |
|------|--------|--------|
| **Nav balance** | ✅ | Shows Convex `users.balance` for the first user. |
| **Add funds (Stripe Checkout)** | ✅ | Nav → "Add funds" → amount → Pay → redirects to **Stripe Checkout** (direct). Session created by `stripeCheckout.createCheckout`; after payment, **webhook** credits user balance by email. |
| **Stripe webhook** | ✅ | Endpoint `https://fantastic-falcon-990.convex.site/stripe-webhook` is active in Stripe. `STRIPE_WEBHOOK_SECRET` set in Convex. Credits user balance by email on `checkout.session.completed`. |
| **Convex env** | ✅ | `STRIPE_SECRET_KEY` (test), `STRIPE_WEBHOOK_SECRET`, `AUTUMN_SECRET_KEY` (live) all set. |
| **Frontend env** | ✅ | `apps/web/.env.local` has `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. |
| **Betting** | ✅ | Place bet, pool total, odds, close betting when near end. |
| **Settlement** | ✅ | `settle` (success/fail) and `settleExpired` (timeout): 5% platform take, rest to winners. |
| **Agent earnings (USD)** | ✅ | 5% take is credited to sandbox `agentEarningsUsd`; shown in Goal panel. |
| **Refunds** | ✅ | Refund mutation returns full stake when event is cancelled / no result. |
| **Balance sync after Autumn payment** | ✅ | If using Autumn: when user returns with `?autumn_success=1`, app syncs balance from Autumn. |

---

## Optional (not needed for core flow)

| Part | Status | Does it matter? |
|------|--------|------------------|
| **Stripe Buy Button (nav)** | Optional | Renders only if `NEXT_PUBLIC_STRIPE_BUY_BUTTON_ID` is also set. **No** if you only use "Add funds". |
| **Autumn webhook** | Optional | Would credit balance if user never returns. **No**; we sync on return. |
| **Lemon Squeezy** | Not used | Code exists but not needed. |

---

## Summary

- **Everything works** for "Add funds" via direct Stripe Checkout. Webhook credits balance by email after payment.
- Betting, settlement (5% take), agent earnings, refunds all functional.

---

## Switch to live payments (real money)

Right now **Stripe is in test mode** (`sk_test_...`). No real money is charged or transferred; only test cards work.

To accept **real payments**:

1. In [Stripe Dashboard](https://dashboard.stripe.com) switch to **Live** (toggle in the sidebar). Go to **Developers → API keys** and copy your **Secret key** (`sk_live_...`).

2. **Set the live key in Convex** (run in your terminal; don’t paste the key in chat):
   ```bash
   npx convex env set STRIPE_SECRET_KEY sk_live_xxxxxxxx
   ```

3. **Create the live webhook** (same command, with your live key):
   ```bash
   STRIPE_SECRET_KEY=sk_live_xxxxxxxx node scripts/setup-stripe-webhook.mjs
   ```
   This creates a webhook on your **live** Stripe account and sets `STRIPE_WEBHOOK_SECRET` in Convex for live events.

After that, "Add funds" will create live Checkout sessions and real charges; the webhook will credit balance when customers pay.
