"use client";

import Script from "next/script";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const buyButtonId = process.env.NEXT_PUBLIC_STRIPE_BUY_BUTTON_ID;

export function StripeBuyButton() {
  if (!publishableKey || !buyButtonId) {
    return (
      <span className="text-xs text-text-muted">
        Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY and NEXT_PUBLIC_STRIPE_BUY_BUTTON_ID
      </span>
    );
  }

  return (
    <>
      <Script
        src="https://js.stripe.com/v3/buy-button.js"
        strategy="afterInteractive"
      />
      {/* @ts-expect-error custom element from Stripe */}
      <stripe-buy-button
        buy-button-id={buyButtonId}
        publishable-key={publishableKey}
      />
    </>
  );
}
