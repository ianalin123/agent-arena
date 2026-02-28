"use client";

import { useState } from "react";

interface PromptInputProps {
  sandboxId: string;
}

export function PromptInput({ sandboxId }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");

  // TODO: Wire Convex prompts.submit mutation

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    // TODO: Call mutation
    setPrompt("");
  };

  return (
    <div>
      <h3>Send a Suggestion</h3>
      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Try posting memes..."
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
      />
      <button onClick={handleSubmit}>Send</button>
    </div>
  );
}
