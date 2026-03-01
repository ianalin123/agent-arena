"use client";
import { useState, useMemo } from "react";

const CHART_ICON = "https://d2xsxph8kpxj0f.cloudfront.net/310519663059134276/eTTikoaxRiKvzwgWkfvqus/deco-chart-up_23c5aab8.png";

export interface ChartPoint {
  t: number;
  claude: number;
  openai: number;
  eventLabel?: string;
}

export interface ProbabilityChartProps {
  chartData: ChartPoint[];
}

type TimeFilter = "5m" | "15m" | "1h" | "All";

const TIME_WINDOWS: Record<TimeFilter, number | null> = {
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "All": null,
};

export function ProbabilityChart({ chartData }: ProbabilityChartProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("All");

  const filtered = useMemo(() => {
    const window = TIME_WINDOWS[timeFilter];
    if (!window || chartData.length === 0) return chartData;
    const cutoff = chartData[chartData.length - 1].t - window;
    const result = chartData.filter((d) => d.t >= cutoff);
    return result.length >= 2 ? result : chartData.slice(-2);
  }, [chartData, timeFilter]);

  const W = 600, H = 130;
  const PAD = { top: 14, right: 12, bottom: 22, left: 32 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  if (filtered.length < 2) return null;

  const maxT = filtered[filtered.length - 1].t;
  const minT = filtered[0].t;
  const tRange = maxT - minT || 1;

  const xScale = (t: number) => PAD.left + ((t - minT) / tRange) * innerW;
  const yScale = (v: number) => PAD.top + (1 - v / 100) * innerH;

  const claudePath = filtered
    .map((d, i) => `${i === 0 ? "M" : "L"}${xScale(d.t).toFixed(1)},${yScale(d.claude).toFixed(1)}`)
    .join(" ");
  const openaiPath = filtered
    .map((d, i) => `${i === 0 ? "M" : "L"}${xScale(d.t).toFixed(1)},${yScale(d.openai).toFixed(1)}`)
    .join(" ");

  const claudeAreaPath =
    claudePath +
    ` L${xScale(maxT).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${xScale(minT).toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`;
  const openaiAreaPath =
    openaiPath +
    ` L${xScale(maxT).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${xScale(minT).toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`;

  const lastPoint = filtered[filtered.length - 1];
  const keyEvents = filtered.filter((d) => d.eventLabel);
  const yTicks = [25, 50, 75];

  return (
    <div className="card-sm" style={{ padding: "1.25rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.25rem" }}>
            <img src={CHART_ICON} alt="" style={{ height: 20, width: 20, objectFit: "contain" }} />
            <div className="text-label">Win probability</div>
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <div style={{ width: 12, height: 3, background: "var(--claude)", borderRadius: 2 }} />
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--claude)" }}>
                Claude {lastPoint.claude.toFixed(0)}%
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <div style={{ width: 12, height: 3, background: "var(--openai)", borderRadius: 2 }} />
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--openai)" }}>
                OpenAI {lastPoint.openai.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Time filter buttons — now stateful */}
        <div style={{ display: "flex", gap: "0.375rem" }}>
          {(["5m", "15m", "1h", "All"] as TimeFilter[]).map((t) => (
            <button
              key={t}
              onClick={() => setTimeFilter(t)}
              style={{
                padding: "0.25rem 0.625rem",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: timeFilter === t ? "var(--purple-2)" : "transparent",
                color: timeFilter === t ? "var(--purple)" : "var(--ink-3)",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* SVG chart */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
        <defs>
          <linearGradient id="claudeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D97706" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#D97706" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="openaiGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y-axis grid lines */}
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left} y1={yScale(tick)}
              x2={W - PAD.right} y2={yScale(tick)}
              stroke="var(--border)"
              strokeWidth="1"
              strokeDasharray={tick === 50 ? "4,4" : "2,4"}
              opacity={tick === 50 ? 1 : 0.5}
            />
            <text x={PAD.left - 4} y={yScale(tick) + 4} textAnchor="end" fontSize="9" fill="var(--ink-3)">{tick}</text>
          </g>
        ))}

        {/* Area fills */}
        <path d={claudeAreaPath} fill="url(#claudeGrad)" />
        <path d={openaiAreaPath} fill="url(#openaiGrad)" />

        {/* Lines */}
        <path d={claudePath} fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={openaiPath} fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Key event markers — only for >5% swings */}
        {keyEvents.map((d, i) => {
          const cx = xScale(d.t);
          const prevPoint = filtered[filtered.indexOf(d) - 1];
          const isClaudeUp = prevPoint ? d.claude > prevPoint.claude : true;
          const markerColor = isClaudeUp ? "#D97706" : "#2563EB";
          const cy = yScale(d.claude);
          // Alternate labels above/below to reduce overlap
          const labelAbove = i % 2 === 0;
          const labelY = labelAbove ? cy - 16 : cy + 24;
          const labelLen = (d.eventLabel?.length ?? 0) * 5.5 + 10;
          const labelX = Math.min(Math.max(cx, PAD.left + labelLen / 2), W - PAD.right - labelLen / 2);

          return (
            <g key={i}>
              {/* Vertical dashed line */}
              <line
                x1={cx} y1={PAD.top}
                x2={cx} y2={PAD.top + innerH}
                stroke={markerColor}
                strokeWidth="1"
                strokeDasharray="3,3"
                opacity="0.45"
              />
              {/* Diamond marker on the Claude line */}
              <polygon
                points={`${cx},${cy - 5} ${cx + 5},${cy} ${cx},${cy + 5} ${cx - 5},${cy}`}
                fill={markerColor}
                opacity="0.9"
              />
              {/* Label pill */}
              <rect
                x={labelX - labelLen / 2}
                y={labelY - 11}
                width={labelLen}
                height={14}
                rx={4}
                fill={markerColor}
                opacity="0.18"
              />
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                fontSize="8.5"
                fontWeight="700"
                fill={markerColor}
                fontFamily="'DM Mono', monospace"
              >
                {d.eventLabel}
              </text>
            </g>
          );
        })}

        {/* Live endpoint dots */}
        <circle cx={xScale(lastPoint.t)} cy={yScale(lastPoint.claude)} r="4" fill="#D97706" />
        <circle cx={xScale(lastPoint.t)} cy={yScale(lastPoint.openai)} r="4" fill="#2563EB" />
      </svg>
    </div>
  );
}
