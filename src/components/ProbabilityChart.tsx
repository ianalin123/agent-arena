"use client";

import { useRef } from "react";

const CHART_ICON = "https://d2xsxph8kpxj0f.cloudfront.net/310519663059134276/eTTikoaxRiKvzwgWkfvqus/deco-chart-up_23c5aab8.png";

export interface ProbabilityChartProps {
  chartData: Array<{ t: number; claude: number; openai: number }>;
}

export function ProbabilityChart({ chartData }: ProbabilityChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 600, H = 120;
  const PAD = { top: 10, right: 10, bottom: 20, left: 30 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  if (chartData.length < 2) return null;

  const maxT = chartData[chartData.length - 1].t;
  const minT = chartData[0].t;
  const tRange = maxT - minT || 1;

  const xScale = (t: number) => PAD.left + ((t - minT) / tRange) * innerW;
  const yScale = (v: number) => PAD.top + (1 - v / 100) * innerH;

  const claudePath = chartData.map((d, i) => `${i === 0 ? "M" : "L"}${xScale(d.t).toFixed(1)},${yScale(d.claude).toFixed(1)}`).join(" ");
  const openaiPath = chartData.map((d, i) => `${i === 0 ? "M" : "L"}${xScale(d.t).toFixed(1)},${yScale(d.openai).toFixed(1)}`).join(" ");

  const claudeAreaPath = claudePath + ` L${xScale(maxT).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${xScale(minT).toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`;
  const openaiAreaPath = openaiPath + ` L${xScale(maxT).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${xScale(minT).toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`;

  const lastPoint = chartData[chartData.length - 1];

  return (
    <div className="card-sm" style={{ padding: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.25rem" }}>
            <img src={CHART_ICON} alt="" style={{ height: 20, width: 20, objectFit: "contain" }} />
            <div className="text-label">Win probability</div>
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <div style={{ width: 12, height: 3, background: "var(--claude)", borderRadius: 2 }} />
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--claude)" }}>Claude {lastPoint.claude.toFixed(0)}%</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <div style={{ width: 12, height: 3, background: "var(--openai)", borderRadius: 2 }} />
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--openai)" }}>OpenAI {lastPoint.openai.toFixed(0)}%</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.375rem" }}>
          {["5m", "15m", "1h", "All"].map((t) => (
            <button key={t} style={{
              padding: "0.25rem 0.625rem",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: t === "All" ? "var(--purple-2)" : "transparent",
              color: t === "All" ? "var(--purple)" : "var(--ink-3)",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}>{t}</button>
          ))}
        </div>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
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
        <line x1={PAD.left} y1={yScale(50)} x2={W - PAD.right} y2={yScale(50)} stroke="var(--border)" strokeWidth="1" strokeDasharray="4,4" />
        <text x={PAD.left - 4} y={yScale(50) + 4} textAnchor="end" fontSize="9" fill="var(--ink-3)">50</text>
        <path d={claudeAreaPath} fill="url(#claudeGrad)" />
        <path d={openaiAreaPath} fill="url(#openaiGrad)" />
        <path d={claudePath} fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={openaiPath} fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={xScale(lastPoint.t)} cy={yScale(lastPoint.claude)} r="4" fill="#D97706" />
        <circle cx={xScale(lastPoint.t)} cy={yScale(lastPoint.openai)} r="4" fill="#2563EB" />
      </svg>
    </div>
  );
}
