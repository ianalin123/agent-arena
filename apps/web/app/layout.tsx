"use client";

import "./globals.css";
import { DM_Sans, DM_Mono } from "next/font/google";
import { ReactNode } from "react";
import dynamic from "next/dynamic";
import { NavAddFunds } from "../components/NavAddFunds";

const AppShell = dynamic(
  () => import("@/components/AppShell").then((m) => ({ default: m.AppShell })),
  { ssr: false },
);

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

export default function RootLayout({ children }: { children: ReactNode }) {
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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
