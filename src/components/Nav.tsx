"use client";

import Link from "next/link";
import { type ReactNode } from "react";

export interface NavProps {
  authSlot?: ReactNode;
}

export function Nav({ authSlot }: NavProps) {
  return (
    <nav className="nav">
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        <Link href="/" style={{ fontWeight: 800, fontSize: "1.125rem", color: "var(--ink)", textDecoration: "none", letterSpacing: "-0.02em" }}>
          Agent Arena
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <a href="#how-it-works" className="nav-link">How it works</a>
          <a href="#upcoming" className="nav-link">Upcoming</a>
          {authSlot ?? (
            <button className="btn-primary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.875rem" }}>
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
