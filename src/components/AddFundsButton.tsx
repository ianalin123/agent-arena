"use client";

import { useState } from "react";
import { useConvexAuth, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

const DEPOSIT_CENTS = 1000;

export function AddFundsButton() {
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.currentUser, isAuthenticated ? {} : "skip");
  const createCheckout = useAction(api.lemonsqueezy.createDepositCheckout);
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated || !user) return null;

  const handleClick = async () => {
    setLoading(true);
    try {
      const { url } = await createCheckout({
        amountCents: DEPOSIT_CENTS,
        userId: user._id,
        redirectUrl: window.location.href,
      });
      window.location.href = url;
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        padding: "0.5rem 1.25rem",
        fontSize: "0.875rem",
        fontWeight: 600,
        color: loading ? "#aaa" : "#7C6FF7",
        background: "transparent",
        border: "2px solid",
        borderColor: loading ? "#ccc" : "#7C6FF7",
        borderRadius: "0.5rem",
        cursor: loading ? "not-allowed" : "pointer",
        transition: "all 150ms ease",
      }}
      onMouseEnter={(e) => {
        if (loading) return;
        e.currentTarget.style.background = "#7C6FF7";
        e.currentTarget.style.color = "#FFFFFF";
      }}
      onMouseLeave={(e) => {
        if (loading) return;
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "#7C6FF7";
      }}
    >
      {loading ? "Redirecting…" : "Add Funds"}
    </button>
  );
}
