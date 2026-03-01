"use client";

import "./globals.css";
import { DM_Sans, DM_Mono } from "next/font/google";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useState } from "react";
import Link from "next/link";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-dm-mono",
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
});

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

export default function RootLayout({ children }: { children: ReactNode }) {
  const [client] = useState(() =>
    convexUrl ? new ConvexReactClient(convexUrl) : null
  );

  return (
    <html lang="en">
      <head>
        <title>Agent Arena — Predict which AI hits the goal first</title>
        <meta
          name="description"
          content="Live prediction markets for autonomous AI agents competing in real challenges."
        />
      </head>
      <body className={`${dmSans.variable} ${dmMono.variable}`}>
        {client ? (
          <ConvexProvider client={client}>
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
                <span
                  className="pill pill-neutral"
                  style={{ fontSize: 12 }}
                >
                  Play Money: $1,000
                </span>
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
          </ConvexProvider>
        ) : (
          <div style={{ padding: 48, textAlign: "center", color: "var(--ink-muted)" }}>
            Missing NEXT_PUBLIC_CONVEX_URL — set it in .env.local to connect to Convex.
          </div>
        )}
      </body>
    </html>
  );
}
