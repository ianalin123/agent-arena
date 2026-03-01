import { NextRequest, NextResponse } from "next/server";

/**
 * x402 endpoint: 402 when no payment, 200 when PAYMENT-SIGNATURE present.
 * Register this URL with Locus (e.g. https://your-ngrok.ngrok-free.app/x402/paid-resource).
 */
export async function GET(request: NextRequest) {
  return x402Handler(request);
}

export async function POST(request: NextRequest) {
  return x402Handler(request);
}

async function x402Handler(request: NextRequest) {
  const resource = request.url;
  const payTo = process.env.X402_PAY_TO_ADDRESS ?? "0x0000000000000000000000000000000000000000";
  const network = process.env.X402_NETWORK ?? "base-sepolia";
  const maxAmount = process.env.X402_MAX_AMOUNT_REQUIRED ?? "1000";

  const paymentSignature =
    request.headers.get("payment-signature") ?? request.headers.get("PAYMENT-SIGNATURE") ?? "";
  const hasPayment = paymentSignature.trim().length >= 32;

  if (!hasPayment) {
    const body = {
      accepts: [
        {
          scheme: "exact",
          network,
          maxAmountRequired: maxAmount,
          resource,
          payTo,
          mimeType: "application/json",
          description: "Agent Arena paid resource (x402)",
        },
      ],
    };
    return NextResponse.json(body, { status: 402 });
  }

  return NextResponse.json(
    { status: "ok", message: "Payment accepted" },
    { status: 200 }
  );
}
