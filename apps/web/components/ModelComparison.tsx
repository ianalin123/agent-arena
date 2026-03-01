"use client";

interface ModelComparisonProps {
  sandboxes: any[];
}

const MODEL_META: Record<string, { name: string; color: string }> = {
  "claude-sonnet": { name: "Claude Sonnet", color: "var(--amber)" },
  "claude-opus": { name: "Claude Opus", color: "#C2410C" },
  "gpt-4o": { name: "GPT-4o", color: "var(--green)" },
  "gemini-2-flash": { name: "Gemini Flash", color: "var(--blue)" },
};

export function ModelComparison({ sandboxes }: ModelComparisonProps) {
  const grouped = sandboxes.reduce(
    (acc: Record<string, any[]>, sb: any) => {
      const key = sb.model || "unknown";
      if (!acc[key]) acc[key] = [];
      acc[key].push(sb);
      return acc;
    },
    {} as Record<string, any[]>
  );

  const models = Object.entries(grouped).map(([model, sbs]) => {
    const total = sbs.length;
    const completed = sbs.filter((s: any) => s.status === "completed").length;
    const active = sbs.filter((s: any) => s.status === "active").length;
    const avgProgress =
      sbs.reduce(
        (sum: number, s: any) =>
          sum + (s.currentProgress / s.targetValue) * 100,
        0
      ) / (total || 1);

    const meta = MODEL_META[model] ?? { name: model, color: "var(--ink-muted)" };

    return {
      model,
      ...meta,
      total,
      completed,
      active,
      avgProgress,
      successRate: total > 0 ? ((completed / total) * 100).toFixed(0) : "--",
    };
  });

  if (models.length <= 1) return null;

  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 16 }}>
        Model Comparison
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
        {models.map((m) => (
          <div key={m.model} className="card-white" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{m.name}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--ink-muted)" }}>Sessions</span>
                <span className="font-mono" style={{ fontWeight: 500 }}>{m.total}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--ink-muted)" }}>Success Rate</span>
                <span className="font-mono" style={{ fontWeight: 500, color: "var(--green)" }}>
                  {m.successRate}%
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--ink-muted)" }}>Avg Progress</span>
                <span className="font-mono" style={{ fontWeight: 500 }}>{m.avgProgress.toFixed(0)}%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--ink-muted)" }}>Active</span>
                <span className="font-mono" style={{ fontWeight: 500 }}>{m.active}</span>
              </div>
            </div>

            <div className="progress-track" style={{ marginTop: 12 }}>
              <div
                className="progress-fill-purple"
                style={{ width: `${m.avgProgress}%`, background: m.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
