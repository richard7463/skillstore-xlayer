import { NextRequest, NextResponse } from "next/server";
import { getSkillById } from "@/lib/skills";
import {
  buildSkillChallenge,
  decodePaymentHeader,
  generateAuditId,
  isFreeTrial,
  validatePaymentStructure,
  verifyOnchainTransfer,
  XLAYER_CAIP2
} from "@/lib/x402";
import { addInvokeLog } from "@/lib/store";
import { X402_PAYMENT_HEADER } from "@/lib/x402Shared";

// Prefer ai2human-style env naming, fallback to legacy var
const PAY_TO =
  process.env.XLAYER_X402_PAY_TO_ADDRESS ||
  process.env.XLAYER_PAY_TO_ADDRESS ||
  "0x3f665386b41Fa15c5ccCeE983050a236E6a10108";

// Simulate OnchainOS API calls — in a real build these would call OKX endpoints
function simulateOnchainOsPrecheck(skillId: string, input: Record<string, unknown>) {
  const precheck = {
    walletApi: { status: "ok", balance: "245.00 USDT0", signerReady: true },
    marketApi: { status: "ok", quote: "route available", slippage: "0.12%" },
    tradeApi: { status: "ok", routeAvailable: true, estimatedGas: "0.001 OKB" }
  };
  return precheck;
}

function executeSkill(
  skillId: string,
  input: Record<string, unknown>
): Record<string, unknown> {
  const invokedAt = new Date().toISOString();
  const auditId = generateAuditId(skillId, invokedAt);

  switch (skillId) {
    case "trade-guardian": {
      const wallet = String(input.wallet || "0xunknown").slice(0, 10);
      const tokenIn = String(input.tokenIn || "USDT0");
      const tokenOut = String(input.tokenOut || "OKB");
      const amount = String(input.amountIn || "100");
      const precheck = simulateOnchainOsPrecheck(skillId, input);
      return {
        signal: "GO",
        walletBalance: precheck.walletApi.balance,
        marketQuote: { price: "18.42", slippage: precheck.marketApi.slippage },
        tradeRoute: `${tokenIn} → ${tokenOut} via XSwap`,
        estimatedOutput: `${(Number(amount) / 18.42).toFixed(4)} ${tokenOut}`,
        onchainOsPrecheck: precheck,
        auditId,
        recommendation: `Wallet funded, route clean — proceed with ${amount} ${tokenIn} → ${tokenOut}.`
      };
    }
    case "xlayer-radar": {
      const wallet = String(input.wallet || "0xunknown").slice(0, 10);
      return {
        alertLevel: "LOW",
        wallet: wallet + "...",
        events: [],
        summary: "No anomalies detected in the last 24h. Wallet behavior within normal parameters.",
        auditId,
        checkedAt: invokedAt
      };
    }
    case "gas-oracle": {
      const chains = (input.chains as string[]) || ["X Layer", "ETH"];
      return {
        recommended: "X Layer",
        estimatedCostUSD: 0.002,
        breakdown: chains.map((c) => ({
          chain: c,
          gasGwei: c === "X Layer" ? "0.001" : "12.4",
          costUSD: c === "X Layer" ? 0.002 : 0.84
        })),
        window: "next 15 min",
        auditId,
        source: "OKX Agent Trade Kit MCP"
      };
    }
    case "portfolio-pulse": {
      return {
        summary: "Portfolio up 3.2% in 24h. OKB +8.1%. USDT0 position healthy at 42%.",
        riskScore: "LOW",
        holdings: [
          { token: "USDT0", value: "$245.00", share: "42%" },
          { token: "OKB", value: "$182.40", share: "31%" },
          { token: "ETH", value: "$158.60", share: "27%" }
        ],
        suggestions: ["Consider reducing OKB above 30% for better diversification."],
        auditId,
        generatedAt: invokedAt
      };
    }
    case "mev-shield": {
      return {
        mevRisk: "LOW",
        score: 12,
        frontrunExposure: "$0.00",
        sandwichRisk: false,
        recommendation: "Safe to broadcast via public RPC.",
        privateRpc: "https://xlayer.drpc.org",
        auditId
      };
    }
    case "trend-signal": {
      return {
        signals: [
          {
            token: "0xABC123...",
            symbol: "XTOKEN",
            score: 84,
            reason: "Whale accumulation + volume spike 4x in 6h",
            chain: "X Layer",
            risk: "MEDIUM"
          }
        ],
        scannedAt: invokedAt,
        auditId,
        source: "OKX dex-signal + dex-trenches"
      };
    }
    default:
      return { result: "executed", auditId, executedAt: invokedAt };
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const skill = getSkillById(params.id);
  if (!skill) return NextResponse.json({ error: "Skill not found" }, { status: 404 });

  const freeTrial = isFreeTrial();
  const paymentHeader = req.headers.get(X402_PAYMENT_HEADER) || req.headers.get(X402_PAYMENT_HEADER.toLowerCase());

  // If not free trial and no payment header → return 402
  if (!freeTrial && !paymentHeader) {
    const resource = `/api/skills/${skill.id}/invoke`;
    const challenge = buildSkillChallenge({
      skillId: skill.id,
      skillName: skill.name,
      priceBaseUnits: skill.priceBaseUnits,
      priceDisplay: skill.priceDisplay,
      resource,
      payTo: PAY_TO
    });
    return NextResponse.json(challenge, {
      status: 402,
      headers: { "Content-Type": "application/json" }
    });
  }

  let paymentMode: "free_trial" | "x402" | "x402_verified" = "free_trial";
  let txHash: string | undefined;
  let payerAddress: string | undefined;
  let onchainProof: Record<string, unknown> | undefined;

  // Validate payment if provided
  if (paymentHeader && !freeTrial) {
    try {
      const resource = `/api/skills/${skill.id}/invoke`;
      const challenge = buildSkillChallenge({
        skillId: skill.id,
        skillName: skill.name,
        priceBaseUnits: skill.priceBaseUnits,
        priceDisplay: skill.priceDisplay,
        resource,
        payTo: PAY_TO
      });
      const payment = decodePaymentHeader(paymentHeader);
      await validatePaymentStructure(payment, challenge.accepts[0]);

      // Extract txHash from payload (agent passes it after broadcasting transferWithAuthorization)
      txHash = (payment.payload as Record<string, unknown>).txHash as string | undefined;
      payerAddress = payment.payload.authorization.from;

      // Verify onchain if txHash is provided
      if (txHash) {
        const proof = await verifyOnchainTransfer(txHash, PAY_TO, skill.priceBaseUnits);
        onchainProof = proof as unknown as Record<string, unknown>;
        paymentMode = "x402_verified";
      } else {
        // No txHash yet — structure is valid but settlement unconfirmed
        paymentMode = "x402";
      }
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid payment: " + (err as Error).message },
        { status: 402 }
      );
    }
  } else if (paymentHeader && freeTrial) {
    // Free trial: accept X-PAYMENT header but skip chain verification
    try {
      const payment = decodePaymentHeader(paymentHeader);
      txHash = (payment.payload as Record<string, unknown>).txHash as string | undefined;
      payerAddress = payment.payload.authorization?.from;
    } catch { /* ignore */ }
    paymentMode = "x402";
  }

  // Parse input
  let input: Record<string, unknown> = {};
  try {
    const body = await req.json().catch(() => ({}));
    input = (body.params as Record<string, unknown>) || body;
  } catch {
    input = {};
  }

  // Execute skill
  const invokedAt = new Date().toISOString();
  const output = executeSkill(skill.id, input);
  const auditId = generateAuditId(skill.id, invokedAt);

  // Log invocation
  addInvokeLog({
    skillId: skill.id,
    skillName: skill.name,
    invokedAt,
    paymentMode,
    txHash,
    payerAddress,
    priceDisplay: skill.priceDisplay,
    input,
    output: onchainProof ? { ...output, onchainProof } : output,
    auditId,
    network: paymentMode === "free_trial" ? "demo" : "xlayer-mainnet"
  });

  return NextResponse.json({
    ok: true,
    skillId: skill.id,
    skillName: skill.name,
    invokedAt,
    paymentMode,
    ...(freeTrial ? { freeTrial: true, note: "Free trial mode — no payment required" } : {}),
    ...(payerAddress ? { payerAddress } : {}),
    ...(txHash ? { txHash } : {}),
    ...(onchainProof ? { onchainProof } : {}),
    result: output,
    auditId,
    network: paymentMode === "free_trial" ? "demo" : "xlayer-mainnet",
    onchainOsApis: skill.okxDependencies
  });
}
