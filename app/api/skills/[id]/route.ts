import { NextRequest, NextResponse } from "next/server";
import { getSkillById } from "@/lib/skills";
import {
  buildSkillChallenge,
  getSkillPaymentAssetSummary,
  getX402ConfigurationHint,
  isFreeTrial,
  isX402Configured,
  XLAYER_CAIP2
} from "@/lib/x402";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const skill = getSkillById(params.id);
  if (!skill) return NextResponse.json({ error: "Skill not found" }, { status: 404 });

  const freeTrial = isFreeTrial();
  const assetSummary = getSkillPaymentAssetSummary({
    priceDisplay: skill.priceDisplay,
    priceBaseUnits: skill.priceBaseUnits
  });

  return NextResponse.json({
    ...skill,
    invokeUrl: `/api/skills/${skill.id}/invoke`,
    paymentInfo: {
      network: XLAYER_CAIP2,
      asset: assetSummary.assetAddress,
      symbol: assetSummary.symbol,
      priceDisplay: skill.priceDisplay,
      priceBaseUnits: skill.priceBaseUnits,
      payTo: assetSummary.payTo,
      freeTrial,
      x402Configured: assetSummary.enabled,
      protocol: "x402 / transferWithAuthorization"
    }
  });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const skill = getSkillById(params.id);
  if (!skill) return NextResponse.json({ error: "Skill not found" }, { status: 404 });

  if (isFreeTrial()) {
    return NextResponse.json({ error: "Use POST /api/skills/[id]/invoke to call a skill" }, { status: 405 });
  }

  if (!isX402Configured()) {
    return NextResponse.json({ error: getX402ConfigurationHint() }, { status: 503 });
  }

  // Return 402 with challenge
  const resource = `/api/skills/${skill.id}/invoke`;
  const challenge = buildSkillChallenge({
    skillId: skill.id,
    skillName: skill.name,
    priceBaseUnits: skill.priceBaseUnits,
    priceDisplay: skill.priceDisplay,
    resource
  });

  return NextResponse.json(challenge, {
    status: 402,
    headers: { "X-402-Challenge": "true" }
  });
}
