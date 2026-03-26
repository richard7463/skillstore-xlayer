import { NextRequest, NextResponse } from "next/server";
import { getSkillById } from "@/lib/skills";
import { buildSkillChallenge, USDT0, XLAYER_CAIP2, isFreeTrial } from "@/lib/x402";

const PAY_TO = process.env.XLAYER_PAY_TO_ADDRESS || "0x3f665386b41Fa15c5ccCeE983050a236E6a10108";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const skill = getSkillById(params.id);
  if (!skill) return NextResponse.json({ error: "Skill not found" }, { status: 404 });

  const freeTrial = isFreeTrial();

  return NextResponse.json({
    ...skill,
    invokeUrl: `/api/skills/${skill.id}/invoke`,
    paymentInfo: {
      network: XLAYER_CAIP2,
      asset: USDT0.address,
      symbol: USDT0.symbol,
      priceDisplay: skill.priceDisplay,
      priceBaseUnits: skill.priceBaseUnits,
      payTo: PAY_TO,
      freeTrial,
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

  const freeTrial = isFreeTrial();
  if (freeTrial) {
    return NextResponse.json({ error: "Use POST /api/skills/[id]/invoke to call a skill" }, { status: 405 });
  }

  // Return 402 with challenge
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
    headers: { "X-402-Challenge": "true" }
  });
}
