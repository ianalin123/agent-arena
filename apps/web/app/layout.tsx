import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agent Arena",
  description: "Watch, bet on, and interact with AI agents pursuing verifiable goals",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
