# Autumn integration (payments + agent earnings)

Autumn (useautumn.com) powers **Add funds** (variable USD) and works with Stripe under the hood. Users can bet any amount; the **total pool** is shown on each sandbox. **Agent earnings** (USD) are tracked per sandbox so you can see how much the agent has earned.

**Only what you must do:** See **[MUST_DO.md](./MUST_DO.md#autumn-add-funds--variable-amount-no-webhook-needed)** for the short list (Autumn account, product + feature in dashboard, then run `set-autumn-secret-key.mjs`).

---

## One-command scripts (do it for you)

From the repo root:

| What | Command |
|------|--------|
| **Set Autumn secret key** (required first) | `node scripts/set-autumn-secret-key.mjs am_sk_xxx` |
| **Test Add funds** (get a checkout URL) | `node scripts/test-autumn-checkout.mjs [customerId] [amount]` — e.g. `node scripts/test-autumn-checkout.mjs <convexUserId> 10`; open the URL to pay. Use a real Convex user id so balance sync credits the right account. |
| **Set product ID** (if not `add_funds`) | `node scripts/set-autumn-product-id.mjs your_product_id` |
| **Set webhook secret** (optional; only if Autumn enables webhooks) | `node scripts/set-autumn-webhook-secret.mjs whsec_xxx` |

If you see **"No prepaid price found for feature usd_credits"**: In Autumn, on the `add_funds` plan, configure `usd_credits` as **Priced** (not Included) and **One-off**, with a price per credit (e.g. $1 per 1 usd_credit). Save the plan feature, then run the test again.

If you see **"(Stripe Error) In order to use Checkout, you must set an account or business name"**: The error is from **Stripe when Autumn** creates the session—so the **Stripe account connected in the Autumn dashboard** must have the business name set. 1) In [Stripe Dashboard → Account](https://dashboard.stripe.com/account), set **Business name** and save. 2) In **Autumn** → Developer → Stripe (or Settings), confirm which Stripe account is connected (test vs live). Use the same Stripe account where you set the name. 3) Try **disconnecting and reconnecting** Stripe in Autumn so it picks up the updated account details.

If you see **"(Stripe Error) You must provide one of \`price\` or \`price_data\` for each line item"**: We worked around this. Autumn’s product config was correct (prepaid, $1/credit) but Autumn wasn’t sending a Stripe price for the line item. The app now passes `checkout_session_params.line_items` with `price_data` ($1/unit) so Stripe gets a valid line item; Autumn still grants the credits from `options`. Checkout should work. To inspect your product in Autumn, run: `npx convex run autumnCheckout:getAutumnProduct`.

---

## Checklist: Is your Autumn setup right?

You created **plans and products** in Autumn. For our “Add funds” flow to work, the app expects:

| In Autumn dashboard | What we expect | If yours is different |
|---------------------|----------------|------------------------|
| **Product** (for adding funds) | Product ID = `add_funds` | Set `AUTUMN_ADD_FUNDS_PRODUCT_ID` in Convex to your product’s ID. |
| **Feature** on that product | Feature ID = `usd_credits` (prepaid / credit, so user can buy a **quantity** in dollars) | We’d need to change the code to use your feature ID, or you add a feature with id `usd_credits`. |

So: one **product** (e.g. “Add funds”) whose **id** is `add_funds` (or whatever you set in Convex), and on that product a **feature** with id `usd_credits` that is prepaid/one-time so checkout can pass `options: [{ feature_id: "usd_credits", quantity: amountDollars }]`. If that matches what you created, you’re set. If your product or feature has different IDs, either rename them in Autumn to `add_funds` / `usd_credits`, or set the env var (and we can update the code for a different feature id if you tell me the id).

---

## What’s implemented

1. **Add funds (variable amount)**  
   - Nav: “Add funds” opens a form; user enters amount and clicks Pay.  
   - Convex action `autumnCheckout.createAddFundsCheckout` calls Autumn’s `/checkout` with your product and returns the Stripe Checkout URL.  
   - **Balance sync:** When the user returns from Stripe Checkout (success URL), we call Autumn’s **GET customer** API, read their `usd_credits` balance, and credit Convex so you **don’t need a webhook**. Optional: if Autumn enables webhooks for you, we can also credit via webhook for real-time updates.

2. **Total pool**  
   - Each sandbox’s betting panel already shows total staked (e.g. “Total pool: $X”).

3. **Agent earnings (USD)**  
   - `sandboxes.agentEarningsUsd` stores how much the agent has earned (USD).  
   - Shown in the Goal panel as “Agent earnings (USD): $X” when > 0.  
   - Backend can credit earnings via `sandboxes.addAgentEarnings` (e.g. from event_bridge or settlement).

---

## What you need to do

### 1. Autumn account and API key

- Sign up at [useautumn.com](https://useautumn.com) and connect Stripe (Autumn uses Stripe for payments).
- In the Autumn dashboard → **Developer → API Keys**, get your **Secret key** (e.g. `am_sk_...`).
- From repo root, run: `node scripts/set-autumn-secret-key.mjs am_sk_xxx` to set `AUTUMN_SECRET_KEY` in Convex.

### 2. “Add funds” product in Autumn

- In the Autumn dashboard, create a **product** for adding funds, e.g.:
  - **Product ID:** `add_funds` (or set `AUTUMN_ADD_FUNDS_PRODUCT_ID` in Convex to match what you create).
  - **Pricing:** one-time, **prepaid** USD credits (e.g. $1 per credit, so quantity = dollars).
  - Create a **feature** (e.g. `usd_credits`) of type credit system or prepaid, and attach it to this product so that when the user buys “quantity” dollars, they get that many USD credits.
- If your product ID is not `add_funds`, set in Convex env:
  - `AUTUMN_ADD_FUNDS_PRODUCT_ID` = your product ID.

Details depend on your Autumn pricing model; see [Monetary credits](https://docs.useautumn.com/examples/monetary-credits) and [One-time top ups](https://docs.useautumn.com/examples/prepaid) in their docs.

### 3. Balance after payment (no webhook required)

Per [Autumn’s docs](https://docs.useautumn.com/welcome): *“No webhooks needed!”* — Autumn handles Stripe webhooks; we **sync balance when the user returns** from checkout:

- Checkout **success URL** includes `?autumn_success=1`. When the app loads with that param, we call Autumn’s **GET** ` /v1/customers/{customer_id}` and read `balances.usd_credits.current_balance`, then credit the Convex user (and clear the param). No webhook or webhook secret needed.

### 4. Optional: Autumn webhook (real-time credit)

If you want balance to update even if the user never returns to the app:

- Autumn webhooks are **beta**. The **Developer** menu may only show “API Keys” and “Stripe” until webhooks are enabled. Contact Autumn (Discord or support@useautumn.com) to enable webhooks and get a signing secret.
- Once enabled, add endpoint **URL** `https://<your-convex-deployment>.convex.site/autumn-webhook`, event `customer.products.updated`, and set **AUTUMN_WEBHOOK_SECRET** in Convex env. Our `/autumn-webhook` handler will then also credit balance on payment.

---

## Flow summary

| Step | Who | What |
|------|-----|------|
| 1 | User | Clicks “Add funds”, enters amount, clicks Pay. |
| 2 | App | Calls `autumnCheckout.createAddFundsCheckout({ customerId: userId, amountDollars })` and redirects to the returned URL. |
| 3 | Autumn / Stripe | User pays on Stripe Checkout. |
| 4 | App | User is redirected back with `?autumn_success=1`; app calls Autumn GET customer and Convex syncs balance (no webhook). |
| 5 | User | Uses balance to place bets; total pool is shown on the sandbox. |
| 6 | Backend | Settlement already credits agent earnings (5% platform take). For other earnings (e.g. task completion), call `sandboxes.addAgentEarnings` so “Agent earnings (USD)” stays in sync. |

---

## Crediting agent earnings

**Settlement:** When a pool is settled (`betting.settle` or `betting.settleExpired`), the 5% platform take is automatically credited to the sandbox’s agent earnings—no extra step.

For other cases (e.g. task completion or external payouts), record USD earned by the agent:

- From Convex (e.g. in `event_bridge` or settlement logic), call:
  - `internal.sandboxes.addAgentEarnings({ sandboxId, amountUsd })`
- The sandbox’s `agentEarningsUsd` is updated and shown in the UI.

You can hook this into your existing completion/settlement flow when you’re ready.

---

## Billing page & payments “because of the agent”

You want to **show a billing page** and **handle all payments that happened because of the agent**. Here’s how it fits together:

1. **Billing page (what we can show)**  
   - **Balance** – Already in the nav (from Convex `users.balance`).  
   - **Add funds** – Nav “Add funds” opens the Autumn checkout flow (variable amount).  
   - **Manage payment method / invoices** – Autumn can open Stripe’s [billing portal](https://docs.useautumn.com/documentation/getting-started/display-billing#stripe-billing-portal) for the customer (update card, see invoices, cancel). We can add a “Manage billing” button that calls Autumn’s `billingPortal` API so the user is sent to Stripe’s page.  
   - **Plans & usage** – Autumn’s [customer API](https://docs.useautumn.com/documentation/getting-started/display-billing) returns active plans and feature usage/balances so you can show “Current plan” and usage on the billing page.

2. **Payments that happened because of the agent**  
   - **Agent spending** – When the agent makes a payment (e.g. Locus), we log it in Convex `paymentTransactions` (sandbox, amount, description, recipient, status). You can show these on a billing/activity page so users see “payments made by the agent.”  
   - **Agent earnings** – Stored in `sandboxes.agentEarningsUsd` and shown in the Goal panel. You can also list “Earnings by agent” (e.g. per sandbox) on the billing page.

So: **plans + products in Autumn** cover “Add funds” and (optionally) Stripe billing portal and plan/usage display. **Convex** holds balance, bets, pool total, agent payment history (`paymentTransactions`), and agent earnings (`agentEarningsUsd`). Together that gives you a billing page that shows balance, add funds, manage payment method, and all payments/earnings tied to the agent. If you want, we can add a dedicated **/billing** or **/account** page that wires this up (balance, Add funds, “Manage billing” → Stripe portal, list of agent payments and earnings).
