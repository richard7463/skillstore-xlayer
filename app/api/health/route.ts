import { NextResponse } from "next/server";
import { isFreeTrial, freeUntilLabel, USDT0, XLAYER_CAIP2 } from "@/lib/x402";
import { getTotalInvocations } from "@/lib/store";
import { SKILLS } from "@/lib/skills";

export async function GET() {
  const freeTrial = isFreeTrial();
  return NextResponse.json({
    status: "ok",
    project: "SkillStore — X Layer OnchainOS Skill Marketplace",
    network: XLAYER_CAIP2,
    paymentAsset: USDT0.symbol,
    paymentAssetAddress: USDT0.address,
    freeTrial,
    freeUntil: freeTrial ? freeUntilLabel() : null,
    totalSkills: SKILLS.length,
    totalInvocations: getTotalInvocations(),
    onchainOsIntegrations: [
      "Wallet API", "Market API", "Trade API",
      "dex-signal", "dex-trenches", "dex-token",
      "onchain-gateway", "security", "audit-log",
      "agentic-wallet", "Agent Trade Kit MCP"
    ],
    x402Protocol: "transferWithAuthorization on X Layer mainnet",
    proofTxHash: "0x9c01ad8dac5f2fa1d77da8e9b3f2a3afbfe539ea68af7f3929d7bf9a5f3f5d67",
    explorerUrl: "https://www.oklink.com/xlayer/tx/0x9c01ad8dac5f2fa1d77da8e9b3f2a3afbfe539ea68af7f3929d7bf9a5f3f5d67"
  });
}
