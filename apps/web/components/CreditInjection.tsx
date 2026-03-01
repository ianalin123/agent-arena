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
    <div className="card-white" style={{ padding: 20 }}>
      <h3 className="label-caps" style={{ marginBottom: 8 }}>Fund This Agent</h3>
      <p style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 12 }}>
        Add compute credits to keep the agent running longer.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {AMOUNTS.map((amount) => (
          <button
            key={amount}
            onClick={() => handleInject(amount)}
            disabled={injecting}
            className="btn-outline"
            style={{
              padding: "8px 0",
              fontSize: 13,
              borderRadius: 10,
              opacity: injecting ? 0.5 : 1,
              cursor: injecting ? "not-allowed" : "pointer",
            }}
          >
            ${amount}
          </button>
        ))}
      </div>

      {success && (
        <p style={{ fontSize: 12, color: "var(--green)", textAlign: "center", marginTop: 8 }}>
          Credits added!
        </p>
      )}
    </div>
  );
}
