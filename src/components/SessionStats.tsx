const TROPHY_ICON = "https://d2xsxph8kpxj0f.cloudfront.net/310519663059134276/eTTikoaxRiKvzwgWkfvqus/deco-trophy-NdetxUiovS6DTBvAMyCoXJ.png";

export interface SessionStatsProps {
  sessionNumber: number;
  viewers: number;
  timeElapsed: number;
  claudeComputeCost: number;
  openaiComputeCost: number;
  totalPool: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SessionStats({
  sessionNumber,
  viewers,
  timeElapsed,
  claudeComputeCost,
  openaiComputeCost,
  totalPool,
}: SessionStatsProps) {
  const rows = [
    { label: "Session", value: `#${sessionNumber}` },
    { label: "Watchers", value: viewers.toLocaleString() },
    { label: "Elapsed", value: formatTime(timeElapsed) },
    { label: "Claude compute", value: `$${claudeComputeCost.toFixed(2)}` },
    { label: "OpenAI compute", value: `$${openaiComputeCost.toFixed(2)}` },
    { label: "Total pool", value: `$${(totalPool / 1000).toFixed(1)}k` },
  ];

  return (
    <div className="card-sm" style={{ padding: "1.25rem", position: "relative", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.875rem" }}>
        <img src={TROPHY_ICON} alt="" style={{ height: 22, width: 22, objectFit: "contain" }} />
        <div className="text-label">Session stats</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        {rows.map((s) => (
          <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="text-label">{s.label}</span>
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)", fontFamily: "DM Mono, monospace" }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
