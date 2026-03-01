"use client";

const FLAG_ICON = "https://d2xsxph8kpxj0f.cloudfront.net/310519663059134276/eTTikoaxRiKvzwgWkfvqus/deco-flag-HRiHLcsyFyreE52oLXfiab.png";

export interface GoalBannerProps {
  title: string;
  goal: string;
  goalUnit: string;
  goalValue: number;
  claudeProgress: number;
  openaiProgress: number;
  timeElapsed: number;
  timeLimit?: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function GoalBanner({
  title,
  goal,
  goalUnit,
  goalValue,
  claudeProgress,
  openaiProgress,
  timeElapsed,
  timeLimit,
}: GoalBannerProps) {
  const claudeAhead = claudeProgress > openaiProgress;
  return (
    <div className="goal-banner">
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <img src={FLAG_ICON} alt="" style={{ height: 28, width: 28, objectFit: "contain" }} />
            <div>
              <div className="text-label">Goal</div>
              <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--ink)" }}>{goal}</div>
            </div>
          </div>
          <div style={{ width: 1, height: 32, background: "rgba(124,111,247,0.2)" }} />
          <div>
            <div className="text-label">Leading</div>
            <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: claudeAhead ? "var(--claude)" : "var(--openai)" }}>
              {claudeAhead ? "Claude" : "OpenAI"} by {Math.abs(claudeProgress - openaiProgress).toFixed(1)}%
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <div style={{ textAlign: "right" }}>
            <div className="text-label">Elapsed</div>
            <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--ink)", fontFamily: "DM Mono, monospace" }}>
              {formatTime(timeElapsed)}{timeLimit ? ` / ${formatTime(timeLimit)}` : ""}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="text-label">Target</div>
            <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--ink)" }}>
              {goalValue.toLocaleString()} {goalUnit}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
