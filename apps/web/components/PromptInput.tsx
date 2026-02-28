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
    <div className="rounded-xl border border-border bg-bg-card p-5">
      <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-3">
        Send a Suggestion
      </h3>
      <p className="text-xs text-text-muted mb-3">
        The agent will consider your strategy in its next decision.
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Try posting memes..."
          className="flex-1 bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          disabled={sending}
        />
        <button
          onClick={handleSubmit}
          disabled={sending || !prompt.trim()}
          className="px-4 py-2 rounded-lg bg-bg-tertiary border border-border text-sm font-medium hover:bg-bg-card-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sent ? "Sent!" : sending ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
