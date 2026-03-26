import { NextRequest, NextResponse } from "next/server";
import { getSkillById } from "@/lib/skills";
import {
  buildSkillChallenge,
  generateAuditId,
  getSkillPaymentAssetSummary,
  getX402ConfigurationHint,
  isFreeTrial,
  isX402Configured,
  settleSkillInvocationPayment
} from "@/lib/x402";
import { addInvokeLog } from "@/lib/store";
import {
  X402_PAYMENT_HEADER,
  X402_PAYMENT_RESPONSE_HEADER
} from "@/lib/x402Shared";

export const runtime = "nodejs";

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
        wallet: `${wallet}...`,
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
        breakdown: chains.map((chain) => ({
          chain,
          gasGwei: chain === "X Layer" ? "0.001" : "12.4",
          costUSD: chain === "X Layer" ? 0.002 : 0.84
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

  const paymentHeader =
    req.headers.get(X402_PAYMENT_HEADER) || req.headers.get(X402_PAYMENT_HEADER.toLowerCase());
  const forcedPaidMode =
    req.nextUrl.searchParams.get("mode") === "paid" ||
    req.headers.get("x-skillstore-payment-mode") === "paid";
  const freeTrial = isFreeTrial() && !forcedPaidMode && !paymentHeader;
  const assetSummary = getSkillPaymentAssetSummary({
    priceDisplay: skill.priceDisplay,
    priceBaseUnits: skill.priceBaseUnits
  });
  const resource = req.nextUrl.toString();
  const challenge = buildSkillChallenge({
    skillId: skill.id,
    skillName: skill.name,
    priceBaseUnits: skill.priceBaseUnits,
    priceDisplay: skill.priceDisplay,
    resource
  });

  if (!freeTrial && !isX402Configured()) {
    return NextResponse.json(
      {
        error: getX402ConfigurationHint(),
        x402: assetSummary
      },
      { status: 503 }
    );
  }

  if (!freeTrial && !paymentHeader) {
    return NextResponse.json(
      {
        ...challenge,
        x402: assetSummary
      },
      {
        status: 402,
        headers: {
          "Access-Control-Expose-Headers": X402_PAYMENT_RESPONSE_HEADER,
          "Cache-Control": "no-store"
        }
      }
    );
  }

  let input: Record<string, unknown> = {};
  try {
    const body = await req.json().catch(() => ({}));
    input = (body.params as Record<string, unknown>) || body;
  } catch {
    input = {};
  }

  let paymentMode: "free_trial" | "x402_exact" = "free_trial";
  let settlement:
    | Awaited<ReturnType<typeof settleSkillInvocationPayment>>
    | null = null;

  if (!freeTrial && paymentHeader) {
    try {
      settlement = await settleSkillInvocationPayment({
        paymentHeader,
        challenge
      });
      paymentMode = "x402_exact";
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "x402 settlement failed",
          x402: assetSummary
        },
        {
          status: 400,
          headers: {
            "Access-Control-Expose-Headers": X402_PAYMENT_RESPONSE_HEADER,
            "Cache-Control": "no-store"
          }
        }
      );
    }
  }

  const invokedAt = new Date().toISOString();
  const output = executeSkill(skill.id, input);
  const auditId = generateAuditId(skill.id, invokedAt);

  addInvokeLog({
    skillId: skill.id,
    skillName: skill.name,
    invokedAt,
    paymentMode,
    txHash: settlement?.txHash,
    payerAddress: settlement?.payerAddress,
    priceDisplay: skill.priceDisplay,
    input,
    output,
    auditId,
    network: paymentMode === "free_trial" ? "demo" : "xlayer-mainnet"
  });

  return NextResponse.json(
    {
      ok: true,
      skillId: skill.id,
      skillName: skill.name,
      invokedAt,
      paymentMode,
      ...(freeTrial ? { freeTrial: true, note: "Free trial mode — no payment required" } : {}),
      ...(settlement
        ? {
            payerAddress: settlement.payerAddress,
            txHash: settlement.txHash,
            payment: settlement
          }
        : {}),
      result: output,
      auditId,
      network: paymentMode === "free_trial" ? "demo" : "xlayer-mainnet",
      onchainOsApis: skill.okxDependencies,
      x402: assetSummary
    },
    {
      headers: {
        "Access-Control-Expose-Headers": X402_PAYMENT_RESPONSE_HEADER,
        "Cache-Control": "no-store",
        [X402_PAYMENT_RESPONSE_HEADER]: settlement?.paymentResponseHeader || ""
      }
    }
  );
}
