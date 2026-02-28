"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/api";
import type { Id } from "@/convex/types";

interface CreditInjectionProps {
  sandboxId: string;
}

const AMOUNTS = [5, 10, 25, 50];

export function CreditInjection({ sandboxId }: CreditInjectionProps) {
  const [injecting, setInjecting] = useState(false);
  const [success, setSuccess] = useState(false);
  const inject = useMutation(api.credits.inject);

  const handleInject = async (amount: number) => {
    setInjecting(true);
    try {
      await inject({
        sandboxId: sandboxId as Id<"sandboxes">,
        userId: "placeholder" as Id<"users">,
        amount,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) {
      console.error("Credit injection failed:", err);
    } finally {
      setInjecting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-bg-card p-5">
      <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-3">
        Fund This Agent
      </h3>
      <p className="text-xs text-text-muted mb-3">
        Add compute credits to keep the agent running longer.
      </p>

      <div className="grid grid-cols-4 gap-2">
        {AMOUNTS.map((amount) => (
          <button
            key={amount}
            onClick={() => handleInject(amount)}
            disabled={injecting}
            className="py-2 rounded-lg bg-bg-tertiary border border-border text-sm font-medium hover:bg-bg-card-hover hover:border-border-bright disabled:opacity-50 transition-all"
          >
            ${amount}
          </button>
        ))}
      </div>

      {success && (
        <p className="text-xs text-accent-green text-center mt-2">
          Credits added!
        </p>
      )}
    </div>
  );
}
