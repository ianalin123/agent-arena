"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";

export function NavAuth() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const user = useQuery(
    api.users.currentUser,
    isAuthenticated ? {} : "skip"
  );

  if (isLoading) {
    return (
      <span style={{ color: "#7C6FF7", fontSize: "0.875rem" }}>…</span>
    );
  }

  if (!isAuthenticated) {
    return (
      <button
        className="btn-primary"
        style={{
          padding: "0.5rem 1.25rem",
          fontSize: "0.875rem",
        }}
      >
        Sign In
      </button>
    );
  }

  const balance = user?.balance ?? 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
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
      <button
        onClick={() => void signOut()}
        style={{
          background: "none",
          border: "none",
          color: "#7C6FF7",
          fontSize: "0.875rem",
          cursor: "pointer",
          padding: 0,
          fontWeight: 500,
        }}
      >
        Sign Out
      </button>
    </div>
  );
}
