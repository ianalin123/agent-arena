"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/types";

interface PromptInputProps {
  sandboxId: string;
}

export function PromptInput({ sandboxId }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const submitPrompt = useMutation(api.prompts.submit);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    setSending(true);
    try {
      await submitPrompt({
        sandboxId: sandboxId as Id<"sandboxes">,
        userId: "placeholder" as Id<"users">,
        promptText: prompt.trim(),
      });
      setPrompt("");
      setSent(true);
      setTimeout(() => setSent(false), 2000);
    } catch (err: any) {
      console.error("Failed to submit prompt:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="card-white" style={{ padding: 20 }}>
      <h3 className="label-caps" style={{ marginBottom: 8 }}>Send a Suggestion</h3>
      <p style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 12 }}>
        The agent will consider your strategy in its next decision.
      </p>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Try posting memes..."
          className="input-warm"
          style={{ flex: 1 }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          disabled={sending}
        />
        <button
          onClick={handleSubmit}
          disabled={sending || !prompt.trim()}
          className="btn-ghost"
          style={{
            opacity: sending || !prompt.trim() ? 0.5 : 1,
            cursor: sending || !prompt.trim() ? "not-allowed" : "pointer",
          }}
        >
          {sent ? "Sent!" : sending ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
