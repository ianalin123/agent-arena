"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/api";
import { BrowserStream } from "../../../components/BrowserStream";
import { BettingPanel } from "../../../components/BettingPanel";
import { AgentThinking } from "../../../components/AgentThinking";
import { GoalProgress } from "../../../components/GoalProgress";
import { PromptInput } from "../../../components/PromptInput";
import { CreditInjection } from "../../../components/CreditInjection";
import { LogStream } from "../../../components/LogStream";
import Link from "next/link";
import type { Id } from "@/convex/types";

export default function SandboxPage() {
  const params = useParams();
  const sandboxId = params.id as string;

  const data = useQuery(api.sandboxes.get, {
    sandboxId: sandboxId as Id<"sandboxes">,
  });

  if (!data || !data.sandbox) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "3px solid var(--purple)",
              borderTopColor: "transparent",
              margin: "0 auto 16px",
            }}
            className="animate-spin"
          />
          <p style={{ color: "var(--ink-muted)", fontSize: 14 }}>Loading sandbox...</p>
        </div>
      </div>
    );
  }

  const { sandbox, pool, recentEvents, recentPayments } = data;

  return (
    <div>
      <Link
        href="/"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, color: "var(--purple)", textDecoration: "none", fontWeight: 500, marginBottom: 16 }}
      >
        ← Back to Arena
      </Link>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          gap: 24,
          alignItems: "start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <BrowserStream
            sandboxId={sandboxId}
            liveUrl={(sandbox as any).liveUrl}
            shareUrl={(sandbox as any).shareUrl}
          />
          <AgentThinking sandboxId={sandboxId} events={recentEvents} />
          <LogStream sandboxId={sandboxId} maxHeight="20rem" />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <GoalProgress sandbox={sandbox} />
          <BettingPanel sandboxId={sandboxId} pool={pool} />
          <CreditInjection sandboxId={sandboxId} />
          <PromptInput sandboxId={sandboxId} />
        </div>
      </div>
    </div>
  );
}
