"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ReactNode, useState } from "react";
import Link from "next/link";
import { NavAuth } from "@/components/NavAuth";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

export function AppShell({ children }: { children: ReactNode }) {
  const [client] = useState(() =>
    convexUrl ? new ConvexReactClient(convexUrl) : null
  );

  if (!client) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "var(--ink-muted)" }}>
        Missing NEXT_PUBLIC_CONVEX_URL — set it in .env.local to connect to Convex.
      </div>
    );
  }

  return (
    <ConvexAuthNextjsProvider client={client}>
      <nav
        style={{
          borderBottom: "1px solid var(--border-light)",
          padding: "0 24px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--bg-cream)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "var(--purple)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            A
          </div>
          <span
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "var(--ink)",
              letterSpacing: "-0.02em",
            }}
          >
            Agent Arena
          </span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Link href="/" className="nav-link">Challenges</Link>
          <NavAuth />
        </div>
      </nav>

      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "24px 16px",
        }}
      >
        {children}
      </main>
    </ConvexAuthNextjsProvider>
  );
}
