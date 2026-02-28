"use client";

import "./globals.css";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useState } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;

export default function RootLayout({ children }: { children: ReactNode }) {
  const [client] = useState(() => new ConvexReactClient(convexUrl));

  return (
    <html lang="en" className="dark">
      <head>
        <title>Agent Arena</title>
        <meta
          name="description"
          content="Watch, bet on, and interact with AI agents pursuing verifiable goals"
        />
      </head>
      <body className="min-h-screen bg-bg-primary text-text-primary antialiased">
        <ConvexProvider client={client}>
          <nav className="border-b border-border px-6 py-4 flex items-center justify-between bg-bg-secondary/80 backdrop-blur-sm sticky top-0 z-50">
            <a href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-purple flex items-center justify-center text-white font-bold text-sm">
                A
              </div>
              <span className="text-lg font-bold tracking-tight">
                Agent Arena
              </span>
            </a>
            <div className="flex items-center gap-4 text-sm text-text-secondary">
              <span className="px-3 py-1.5 rounded-full bg-bg-tertiary border border-border">
                Play Money: $1,000
              </span>
            </div>
          </nav>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            {children}
          </main>
        </ConvexProvider>
      </body>
    </html>
  );
}
