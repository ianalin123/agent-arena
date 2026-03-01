import Markdown from "react-markdown";

export interface ActionItem {
  time: string;
  text: string;
  type: string;
  label?: string;
  pillClass?: string;
}

export interface ActionLogProps {
  agent: "claude" | "openai";
  actions: ActionItem[];
}

const TYPE_TO_PILL: Record<string, { label: string; pillClass: string }> = {
  success:  { label: "Done",    pillClass: "pill-green" },
  error:    { label: "Error",   pillClass: "pill-red" },
  navigate: { label: "Navigate", pillClass: "pill-blue" },
  click:    { label: "Click",   pillClass: "pill-blue" },
  type:     { label: "Type",    pillClass: "pill-blue" },
  analyze:  { label: "Think",   pillClass: "pill-violet" },
};

export function ActionLog({ actions }: ActionLogProps) {
  return (
    <div>
      <div className="text-label" style={{ marginBottom: "0.375rem" }}>Action log</div>
      <div className="action-log" style={{ maxHeight: 200 }}>
        {actions.slice().reverse().map((action, i) => {
          const fallback = TYPE_TO_PILL[action.type] ?? { label: "Step", pillClass: "pill-neutral" };
          const pillLabel = action.label ?? fallback.label;
          const pillClass = action.pillClass ?? fallback.pillClass;

          return (
            <div key={i} className="action-log-item">
              <span className={`action-pill ${pillClass}`}>{pillLabel}</span>
              <span className="action-log-text">
                <Markdown
                  components={{
                    p: ({ children }) => <>{children}</>,
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noreferrer" style={{ color: "var(--purple)", textDecoration: "underline" }}>
                        {children}
                      </a>
                    ),
                  }}
                >
                  {action.text}
                </Markdown>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
