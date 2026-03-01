export function LiveTicker() {
  const items = [
    "🔴 LIVE — 10k Followers Race · Session #12",
    "💰 $48.2k bet pool · 6,759 watching",
    "🤖 Claude leads by 847 followers",
    "🔴 LIVE — $10k Revenue Race · Session #7",
    "💰 $72.6k bet pool · 4,201 watching",
    "🤖 OpenAI leads by $1,240",
    "📈 46 sessions completed · 67% agent survival rate",
  ];
  const doubled = [...items, ...items];
  return (
    <div style={{ background: "var(--cream-2)", borderBottom: "1px solid var(--border)", padding: "0.625rem 0", overflow: "hidden" }}>
      <div className="animate-ticker" style={{ display: "flex", gap: "3rem", whiteSpace: "nowrap" }}>
        {doubled.map((item, i) => (
          <span key={i} style={{ fontSize: "0.8125rem", color: "var(--ink-2)", fontWeight: 500 }}>{item}</span>
        ))}
      </div>
    </div>
  );
}
