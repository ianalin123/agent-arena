"use client";

import { useGuestUser } from "../app/GuestUserProvider";
import { AddFundsButton } from "./AddFundsButton";

export function NavAuth() {
  const { isReady, balance } = useGuestUser();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      {isReady && (
        <span
          style={{
            fontVariantNumeric: "tabular-nums",
            fontWeight: 600,
            fontSize: "0.875rem",
            color: "#1A1A1A",
          }}
        >
          ${balance.toFixed(2)}
        </span>
      )}
      <AddFundsButton />
      <button
        className="btn-primary"
        style={{ padding: "0.5rem 1.25rem", fontSize: "0.875rem" }}
      >
        Sign In
      </button>
    </div>
  );
}
