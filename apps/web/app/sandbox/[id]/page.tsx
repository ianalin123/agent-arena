"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/api";
import { BrowserStream } from "../../../components/BrowserStream";
import { BettingPanel } from "../../../components/BettingPanel";
import { AgentThinking } from "../../../components/AgentThinking";
import { GoalProgress } from "../../../components/GoalProgress";
import { ActivityFeed } from "../../../components/ActivityFeed";
import { PromptInput } from "../../../components/PromptInput";
import { CreditInjection } from "../../../components/CreditInjection";
import type { Id } from "@/convex/types";

export default function SandboxPage() {
  const params = useParams();
  const sandboxId = params.id as string;

  const data = useQuery(api.sandboxes.get, {
    sandboxId: sandboxId as Id<"sandboxes">,
  });

  if (!data || !data.sandbox) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-accent-purple border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading sandbox...</p>
        </div>
      </div>
    );
  }

  const { sandbox, pool, recentEvents, recentPayments } = data;

  return (
    <div>
      <a
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-4 transition-colors"
      >
        ← Back to Arena
      </a>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <BrowserStream
            sandboxId={sandboxId}
            events={recentEvents}
            liveUrl={(sandbox as any).liveUrl}
            shareUrl={(sandbox as any).shareUrl}
          />
          <AgentThinking sandboxId={sandboxId} events={recentEvents} />
          <ActivityFeed sandboxId={sandboxId} events={recentEvents} payments={recentPayments} />
        </div>

        <aside className="space-y-6">
          <GoalProgress sandbox={sandbox} />
          <BettingPanel sandboxId={sandboxId} pool={pool} />
          <CreditInjection sandboxId={sandboxId} />
          <PromptInput sandboxId={sandboxId} />
        </aside>
      </div>
    </div>
  );
}
