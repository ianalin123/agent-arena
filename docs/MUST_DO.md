# What you must do (only these)

Everything else is already implemented. Do **only** the steps below for the integrations you use.

**Convex HTTP base URL** (needed for webhooks): Convex dashboard → your project → **Settings** → **URL**. Example: `https://happy-animal-123.convex.site`.

---

## Stripe (Buy Button – add funds)

1. **Stripe account**  
   Sign up at [dashboard.stripe.com](https://dashboard.stripe.com). Get **Publishable key** (`pk_...`) and **Secret key** (`sk_...` or `rk_...`) from **Developers → API keys**.

2. **Buy Button**  
   In Stripe: create a **Product** (e.g. “Add funds”) and a **Payment Link** or **Buy Button**. Copy the **Buy Button ID** (e.g. `buy_btn_...`).

3. **Frontend env**  
   In `apps/web/.env.local` (create from `apps/web/.env.local.example` if needed), set:
   - `NEXT_PUBLIC_CONVEX_URL` = your Convex deployment URL
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = your Stripe publishable key
   - `NEXT_PUBLIC_STRIPE_BUY_BUTTON_ID` = your Buy Button ID

4. **Webhook (one command)**  
   From repo root:
   ```bash
   STRIPE_SECRET_KEY=sk_xxx node scripts/setup-stripe-webhook.mjs
   ```
   This creates the Stripe webhook and sets `STRIPE_WEBHOOK_SECRET` in Convex.  
   **Note:** Customers must use the **same email** at Stripe Checkout as in your app so we can credit the right user.

---

## Autumn (Add funds – variable amount, no webhook needed)

1. **Autumn account**  
   Sign up at [useautumn.com](https://useautumn.com) and connect Stripe.

2. **Product in Autumn**  
   Create a **product** for adding funds:
   - **Product ID:** `add_funds` (or note your ID and use the script in step 4).
   - Add a **feature** with ID `usd_credits`: type **Credit system** or prepaid, **Priced**, **One-off** (e.g. $1 per 1 usd_credit so quantity = dollars).
   - Attach the feature to the product/plan.

3. **Secret key**  
   Autumn dashboard → **Developer → API Keys**. Copy your **Secret key** (`am_sk_...`).

4. **Set key (one command)**  
   From repo root:
   ```bash
   node scripts/set-autumn-secret-key.mjs am_sk_xxx
   ```
   If your product ID is **not** `add_funds`:
   ```bash
   node scripts/set-autumn-product-id.mjs your_product_id
   ```

Balance is synced when the user **returns** from checkout (no webhook required).

---

## Lemon Squeezy (Add funds)

1. **Lemon Squeezy account**  
   Sign up at [lemonsqueezy.com](https://lemonsqueezy.com). Create a **Store**. Create a **Product** (e.g. “Add funds”, one-time payment) and note **Product ID** and **Variant ID**.

2. **API key & webhook**  
   - **Settings → API:** Create an API key; copy it.  
   - **Settings → Webhooks → Add webhook:**  
     - **URL:** `https://<your-convex-deployment>.convex.site/lemonsqueezy-webhook`  
     - **Events:** `order_created`  
     - **Signing secret:** Generate and copy.

3. **Set all Convex vars (one command)**  
   From repo root:
   ```bash
   node scripts/set-lemonsqueezy-env.mjs <API_KEY> <STORE_ID> <VARIANT_ID> <WEBHOOK_SECRET>
   ```
   Or set `LEMON_SQUEEZY_API_KEY`, `LEMON_SQUEEZY_STORE_ID`, `LEMON_SQUEEZY_VARIANT_ID`, `LEMON_SQUEEZY_WEBHOOK_SECRET` in your environment and run:
   ```bash
   node scripts/set-lemonsqueezy-env.mjs
   ```

---

## Summary

| Integration   | You must do |
|---------------|-------------|
| **Stripe**    | Account + keys; create Buy Button; add 3 vars to `apps/web/.env.local`; run `setup-stripe-webhook.mjs` with secret key. |
| **Autumn**    | Account + connect Stripe; create product `add_funds` + feature `usd_credits`; run `set-autumn-secret-key.mjs` (and optionally `set-autumn-product-id.mjs`). |
| **Lemon Squeezy** | Account; store; product + variant; API key; webhook URL + secret; run `set-lemonsqueezy-env.mjs` with 4 values. |

Settlement (5% platform take, refunds, agent earnings) is already implemented in Convex.
