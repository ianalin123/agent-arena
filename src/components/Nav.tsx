"use client";

import Link from "next/link";
import { type ReactNode } from "react";

const LOGO_ICON = "https://d2xsxph8kpxj0f.cloudfront.net/310519663059134276/eTTikoaxRiKvzwgWkfvqus/logo-cursors-v3-nobg_edbe6dfb.png";

export interface NavProps {
  authSlot?: ReactNode;
}

export function Nav({ authSlot }: NavProps) {
  return (
    <nav className="nav">
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <img src={LOGO_ICON} alt="Agent Arena" style={{ height: 38, width: 38, objectFit: "contain" }} />
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span style={{ fontWeight: 800, fontSize: "1rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>Agent</span>
            <span style={{ fontWeight: 800, fontSize: "1rem", color: "var(--ink)", letterSpacing: "-0.02em" }}>Arena</span>
          </div>
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
