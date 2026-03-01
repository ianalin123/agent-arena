export interface ActionLogProps {
  agent: "claude" | "openai";
  actions: Array<{ time: string; text: string; type: string }>;
}

export function ActionLog({ actions }: ActionLogProps) {
  return (
    <div>
      <div className="text-label" style={{ marginBottom: "0.375rem" }}>Action log</div>
      <div className="action-log" style={{ maxHeight: 160 }}>
        {actions.slice().reverse().map((action, i) => (
          <div key={i} className="action-log-item">
            <span className="action-log-time">
              {action.type === "success" ? "✓" : action.type === "error" ? "✗" : "→"}
            </span>
            <span style={{
              color: action.type === "success" ? "var(--green)" : action.type === "error" ? "var(--red)" : "var(--ink-2)"
            }}>
              {action.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
