"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/api";
import { BrowserStream } from "../../../components/BrowserStream";
import { BettingPanel } from "../../../components/BettingPanel";
import { GoalProgress } from "../../../components/GoalProgress";
import { LogStream } from "../../../components/LogStream";
import { CreditInjection } from "../../../components/CreditInjection";
import { PromptInput } from "../../../components/PromptInput";
import Link from "next/link";
import type { Id } from "@/convex/types";

function formatGoalType(goalType: string): string {
  return goalType
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ChallengePage() {
  const params = useParams();
  const goalType = params.type as string;

  const activeSandboxes = useQuery(api.sandboxes.listActiveByGoalType, {
    goalType,
  });

  // #region agent log
  fetch('http://127.0.0.1:7405/ingest/4e79ba50-ea0a-47f3-988f-e806a4b369cf',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7c7e31'},body:JSON.stringify({sessionId:'7c7e31',location:'apps/web/app/challenge/[type]/page.tsx:27',message:'Challenge page query result',data:{goalTypeFromUrl:goalType,activeSandboxesResult:activeSandboxes,activeSandboxesIsUndefined:activeSandboxes===undefined,activeSandboxesIsNull:activeSandboxes===null,activeSandboxesLength:activeSandboxes?.length??'N/A'},timestamp:Date.now(),hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
  // #endregion

  const sandbox = activeSandboxes?.[0] ?? null;
  const sandboxId = sandbox?._id as string | null;

  const data = useQuery(
    sandbox ? api.sandboxes.get : api.sandboxes.get,
    sandbox ? { sandboxId: sandbox._id as Id<"sandboxes"> } : "skip" as any
  );

  const pool = data?.pool ?? null;

  if (!activeSandboxes) {
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
          <p style={{ color: "var(--ink-muted)", fontSize: 14 }}>Loading challenge…</p>
        </div>
      </div>
    );
  }

  if (!sandbox) {
    return (
      <div style={{ maxWidth: 600, margin: "60px auto", textAlign: "center" }}>
        <Link href="/" style={{ color: "var(--purple)", fontSize: 14, textDecoration: "none" }}>
          ← Back to Challenges
        </Link>
        <div className="card-white" style={{ padding: 48, marginTop: 24 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "var(--bg-cream-dark)",
              margin: "0 auto 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
            }}
          >
            ⏸
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            No Active {formatGoalType(goalType)} Challenge
          </h2>
          <p style={{ color: "var(--ink-muted)", fontSize: 14 }}>
            There are no active sandboxes for this challenge type right now. Check back soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/" style={{ color: "var(--purple)", fontSize: 14, textDecoration: "none", fontWeight: 500 }}>
            ← Back
          </Link>
          <div>
            <span className="label-caps" style={{ display: "block", marginBottom: 2 }}>
              {formatGoalType(sandbox.goalType)}
            </span>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink)" }}>
              {sandbox.goalDescription}
            </h1>
          </div>
        </div>
        <span className={`pill ${sandbox.status === "active" ? "pill-live" : sandbox.status === "completed" ? "pill-green" : sandbox.status === "failed" ? "pill-red" : "pill-neutral"}`}>
          {sandbox.status === "active" ? "LIVE" : sandbox.status.toUpperCase()}
        </span>
      </div>

      {/* Main grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* Left column — browser + log */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <BrowserStream
            sandboxId={sandboxId!}
            liveUrl={(sandbox as any).liveUrl}
            shareUrl={(sandbox as any).shareUrl}
          />

          {/* Future: second VM window slot for comparison */}

          <LogStream sandboxId={sandboxId!} maxHeight="24rem" />
        </div>

        {/* Right column — stats + betting + actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <GoalProgress sandbox={sandbox} />
          <BettingPanel sandboxId={sandboxId!} pool={pool} />
          <CreditInjection sandboxId={sandboxId!} />
          <PromptInput sandboxId={sandboxId!} />
        </div>
      </div>
    </div>
  );
}
