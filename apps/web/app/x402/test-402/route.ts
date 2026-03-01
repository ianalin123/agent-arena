import { NextRequest, NextResponse } from "next/server";

/**
 * Always returns 402 Payment Required (x402).
 * Use to verify Locus/ngrok hits this app: curl -i https://YOUR-URL/x402/test-402
 */
export async function GET(request: NextRequest) {
  const resource = request.url;
  const payTo = process.env.X402_PAY_TO_ADDRESS ?? "0x0000000000000000000000000000000000000000";
  const network = process.env.X402_NETWORK ?? "base-sepolia";
  const maxAmount = process.env.X402_MAX_AMOUNT_REQUIRED ?? "1000";

  const body = {
    accepts: [
      {
        scheme: "exact",
        network,
        maxAmountRequired: maxAmount,
        resource,
        payTo,
        mimeType: "application/json",
        description: "Agent Arena x402 test endpoint",
      },
    ],
  };

  return NextResponse.json(body, { status: 402 });
}
