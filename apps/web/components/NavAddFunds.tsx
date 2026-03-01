"use client";

import { useState, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/api";
import { AddFundsAutumn } from "./AddFundsAutumn";
import { StripeBuyButton } from "./StripeBuyButton";

export function NavAddFunds() {
  const [showAutumn, setShowAutumn] = useState(false);
  const userId = useQuery(api.users.getFirstUserId);
  const syncBalance = useAction(api.autumnCheckout.syncBalanceFromAutumn);
  const user = useQuery(
    api.users.get,
    userId ? { userId } : "skip"
  );

  const balance = user?.balance ?? 0;

  // After Autumn checkout success, sync balance from Autumn (no webhook needed)
  useEffect(() => {
    if (typeof window === "undefined" || !userId) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("autumn_success") !== "1") return;
    syncBalance({ customerId: userId }).finally(() => {
      params.delete("autumn_success");
      const qs = params.toString();
      const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
      window.history.replaceState(null, "", url);
    });
  }, [userId, syncBalance]);

  // Clear stripe_success param after return from Stripe Checkout (webhook credits balance)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe_success") !== "1") return;
    params.delete("stripe_success");
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, []);

  return (
    <div className="flex items-center gap-3">
      <span className="px-3 py-1.5 rounded-full bg-bg-tertiary border border-border">
        Balance: ${balance.toLocaleString()}
      </span>
      {userId && (
        <>
          <button
            type="button"
            onClick={() => setShowAutumn((s) => !s)}
            className="text-sm font-medium text-accent-purple hover:underline"
          >
            Add funds
          </button>
          {showAutumn && (
            <div className="absolute right-4 top-full mt-1 z-50">
              <AddFundsAutumn
                userId={userId}
                userEmail={user?.email}
                onClose={() => setShowAutumn(false)}
              />
            </div>
          )}
        </>
      )}
      <div className="[&_stripe-buy-button]:scale-90">
        <StripeBuyButton />
      </div>
    </div>
  );
}
