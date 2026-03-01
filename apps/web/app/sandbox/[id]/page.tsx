"use client";

import { useEffect, useRef } from "react";
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
import type { Id } from "@/convex/types";

const _DURL = "http://127.0.0.1:7405/ingest/4e79ba50-ea0a-47f3-988f-e806a4b369cf";
function _dl(loc: string, msg: string, data: Record<string, unknown>, hyp: string) {
  fetch(_DURL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "d46bd0" },
    body: JSON.stringify({ sessionId: "d46bd0", location: loc, message: msg, data, timestamp: Date.now(), hypothesisId: hyp }),
  }).catch(() => {});
}

export default function SandboxPage() {
  const params = useParams();
  const sandboxId = params.id as string;

  const data = useQuery(api.sandboxes.get, {
    sandboxId: sandboxId as Id<"sandboxes">,
  });

  const sandbox = data?.sandbox;
  const liveUrl = (sandbox as any)?.liveUrl;
  const shareUrl = (sandbox as any)?.shareUrl;

  // #region agent log
  const _pageMount = useRef(Date.now());
  useEffect(() => {
    _dl("sandbox/page.tsx:data", "sandbox data update", {
      hasData: !!data,
      status: (sandbox as any)?.status ?? "loading",
      liveUrl: liveUrl ?? "NOT_SET",
      shareUrl: shareUrl ?? "NOT_SET",
      eventCount: data?.recentEvents?.length ?? 0,
      elapsedMs: Date.now() - _pageMount.current,
    }, "A,D");
  }, [liveUrl, shareUrl, !!data]);
  // #endregion

  if (!data || !sandbox) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-accent-purple border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Loading sandbox...</p>
        </div>
      </div>
    );
  }

  const { pool, recentEvents, recentPayments } = data;

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
            liveUrl={(sandbox as any).liveUrl}
            shareUrl={(sandbox as any).shareUrl}
          />
          <AgentThinking sandboxId={sandboxId} events={recentEvents} />
          <LogStream sandboxId={sandboxId} maxHeight="20rem" />
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
