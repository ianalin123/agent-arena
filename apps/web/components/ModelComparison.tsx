"use client";

interface ModelComparisonProps {
  sandboxes: any[];
}

const MODEL_META: Record<string, { name: string; color: string; accent: string }> = {
  "claude-sonnet": { name: "Claude Sonnet", color: "bg-orange-500", accent: "text-orange-400" },
  "claude-opus": { name: "Claude Opus", color: "bg-orange-600", accent: "text-orange-500" },
  "gpt-4o": { name: "GPT-4o", color: "bg-emerald-500", accent: "text-emerald-400" },
  "gemini-2-flash": { name: "Gemini Flash", color: "bg-blue-500", accent: "text-blue-400" },
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
    const failed = sbs.filter((s: any) => s.status === "failed").length;
    const active = sbs.filter((s: any) => s.status === "active").length;
    const avgProgress =
      sbs.reduce(
        (sum: number, s: any) =>
          sum + (s.currentProgress / s.targetValue) * 100,
        0
      ) / (total || 1);

    const meta = MODEL_META[model] ?? {
      name: model,
      color: "bg-gray-500",
      accent: "text-gray-400",
    };

    return {
      model,
      ...meta,
      total,
      completed,
      failed,
      active,
      avgProgress,
      successRate: total > 0 ? ((completed / total) * 100).toFixed(0) : "--",
    };
  });

  if (models.length <= 1) return null;

  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Model Comparison</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {models.map((m) => (
          <div
            key={m.model}
            className="rounded-xl border border-border bg-bg-card p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-3 h-3 rounded-full ${m.color}`} />
              <span className={`text-sm font-medium ${m.accent}`}>
                {m.name}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Sessions</span>
                <span className="font-mono">{m.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Success Rate</span>
                <span className="font-mono text-accent-green">
                  {m.successRate}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Avg Progress</span>
                <span className="font-mono">{m.avgProgress.toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Active</span>
                <span className="font-mono">{m.active}</span>
              </div>
            </div>

            <div className="mt-3 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className={`h-full ${m.color} rounded-full transition-all`}
                style={{ width: `${m.avgProgress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
