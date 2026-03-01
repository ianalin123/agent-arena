"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/types";

interface AddFundsAutumnProps {
  userId: Id<"users">;
  userEmail?: string | null;
  onClose?: () => void;
}

export function AddFundsAutumn({ userId, userEmail, onClose }: AddFundsAutumnProps) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createStripeCheckout = useAction(api.stripeCheckout.createCheckout);

  const handleAddFunds = async () => {
    const num = parseFloat(amount);
    if (!num || num < 1) {
      setError("Enter at least $1");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const base = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "";
      const { url } = await createStripeCheckout({
        amountDollars: num,
        successUrl: `${base}?stripe_success=1`,
        cancelUrl: base,
        customerEmail: userEmail ?? undefined,
      });
      window.location.href = url;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-bg-card p-4">
      <p className="text-sm text-text-secondary mb-2">Add funds (Stripe)</p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">$</span>
          <input
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="w-full bg-bg-tertiary border border-border rounded-lg pl-7 pr-3 py-2 text-sm placeholder:text-text-muted focus:outline-none focus:border-accent-purple"
          />
        </div>
        <button
          onClick={handleAddFunds}
          disabled={loading || !amount}
          className="px-4 py-2 rounded-lg bg-accent-purple text-white text-sm font-medium hover:bg-accent-purple/90 disabled:opacity-50"
        >
          {loading ? "..." : "Pay"}
        </button>
      </div>
      {error && <p className="text-xs text-accent-red mt-1">{error}</p>}
      {onClose && (
        <button type="button" onClick={onClose} className="text-xs text-text-muted mt-2">
          Close
        </button>
      )}
    </div>
  );
}
