"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useGuestUser } from "../app/GuestUserProvider";

const PRESETS = [5, 10, 25, 50, 100];
const MIN_AMOUNT = 1;

export function AddFundsButton() {
  const { isReady, email, balance } = useGuestUser();
  const createCheckout = useAction(api.stripeCheckout.createCheckout);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(10);
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const close = useCallback(() => {
    if (loading) return;
    setOpen(false);
    setError("");
  }, [loading]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!isReady) return null;

  const effectiveAmount = custom.trim() !== ""
    ? (() => { const n = parseFloat(custom); return Number.isFinite(n) && n >= MIN_AMOUNT ? n : 0; })()
    : (selected ?? 0);

  const valid = effectiveAmount >= MIN_AMOUNT;

  const handleCheckout = async () => {
    if (!valid || loading) return;
    setError("");
    setLoading(true);
    try {
      const { url } = await createCheckout({
        amountDollars: effectiveAmount,
        successUrl: window.location.href,
        cancelUrl: window.location.href,
        customerEmail: email,
      });
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  };

  const modal = open ? (
    <div
      onClick={close}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        overflowY: "auto",
        background: "rgba(26, 26, 26, 0.45)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        animation: "fadeIn 0.15s ease",
      }}
    >
      <div
        style={{
          minHeight: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1rem",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "var(--white, #fff)",
            borderRadius: 16,
            border: "1px solid var(--border, #e2ddd8)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
            width: "100%",
            maxWidth: 400,
            padding: "2rem",
            animation: "modalSlideUp 0.2s ease",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
            <div>
              <div className="text-label" style={{ marginBottom: 4 }}>Wallet</div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--ink, #1a1a1a)", letterSpacing: "-0.01em" }}>
                Add Funds
              </h2>
            </div>
            <button
              onClick={close}
              style={{
                background: "var(--cream-2, #e8e4de)",
                border: "none",
                borderRadius: 8,
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: "1.125rem",
                color: "var(--ink-3, #8a8a8a)",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--cream-3, #ddd8d0)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--cream-2, #e8e4de)"; }}
            >
              &times;
            </button>
          </div>

          {/* Current balance */}
          <div style={{
            background: "var(--cream-2, #e8e4de)",
            borderRadius: 10,
            padding: "0.75rem 1rem",
            marginBottom: "1.25rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <span style={{ fontSize: "0.8125rem", color: "var(--ink-3, #8a8a8a)", fontWeight: 500 }}>Current balance</span>
            <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--ink, #1a1a1a)", fontVariantNumeric: "tabular-nums" }}>
              ${balance.toFixed(2)}
            </span>
          </div>

          {/* Preset amounts */}
          <div className="text-label" style={{ marginBottom: "0.5rem" }}>Choose amount</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.5rem", marginBottom: "1rem" }}>
            {PRESETS.map((amt) => {
              const isActive = selected === amt && custom.trim() === "";
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => { setSelected(amt); setCustom(""); setError(""); }}
                  style={{
                    padding: "0.625rem 0",
                    borderRadius: 10,
                    border: isActive ? "2px solid var(--purple, #7c6ff7)" : "1.5px solid var(--border, #e2ddd8)",
                    background: isActive ? "var(--purple-3, #f5f3ff)" : "transparent",
                    color: isActive ? "var(--purple, #7c6ff7)" : "var(--ink, #1a1a1a)",
                    fontWeight: 700,
                    fontSize: "0.9375rem",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    fontFamily: "inherit",
                  }}
                >
                  ${amt}
                </button>
              );
            })}
          </div>

          {/* Custom amount */}
          <div style={{ marginBottom: "1.25rem" }}>
            <div className="text-label" style={{ marginBottom: "0.375rem" }}>Or enter custom amount</div>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "1.125rem",
                fontWeight: 600,
                color: custom.trim() ? "var(--ink, #1a1a1a)" : "var(--ink-3, #8a8a8a)",
                pointerEvents: "none",
              }}>$</span>
              <input
                type="number"
                min={MIN_AMOUNT}
                step={1}
                placeholder="0.00"
                value={custom}
                onChange={(e) => {
                  setCustom(e.target.value);
                  setSelected(null);
                  setError("");
                }}
                className="bet-amount-input"
                style={{ paddingLeft: "1.75rem" }}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              fontSize: "0.8125rem",
              color: "var(--red, #dc2626)",
              background: "var(--red-bg, #fee2e2)",
              borderRadius: 8,
              padding: "0.5rem 0.75rem",
              marginBottom: "0.75rem",
            }}>
              {error}
            </div>
          )}

          {/* Summary row */}
          {valid && (
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
              padding: "0.625rem 0",
              borderTop: "1px solid var(--border, #e2ddd8)",
            }}>
              <span style={{ fontSize: "0.875rem", color: "var(--ink-3, #8a8a8a)" }}>New balance after deposit</span>
              <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--green, #16a34a)", fontVariantNumeric: "tabular-nums" }}>
                ${(balance + effectiveAmount).toFixed(2)}
              </span>
            </div>
          )}

          {/* CTA */}
          <button
            className="btn-primary"
            onClick={handleCheckout}
            disabled={!valid || loading}
            style={{
              width: "100%",
              opacity: !valid || loading ? 0.5 : 1,
              cursor: !valid || loading ? "not-allowed" : "pointer",
            }}
          >
            {loading
              ? "Redirecting to Stripe..."
              : valid
                ? `Deposit $${effectiveAmount.toFixed(2)}`
                : "Select an amount"}
          </button>

          <p style={{ marginTop: "0.75rem", textAlign: "center", fontSize: "0.6875rem", color: "var(--ink-3, #8a8a8a)" }}>
            Secure checkout powered by Stripe
          </p>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-outline"
        style={{ padding: "0.5rem 1.25rem", fontSize: "0.875rem" }}
      >
        Add Funds
      </button>
      {mounted && modal && createPortal(modal, document.body)}
    </>
  );
}
