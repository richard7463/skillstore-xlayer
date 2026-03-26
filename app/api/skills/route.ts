import { NextRequest, NextResponse } from "next/server";
import { SKILLS } from "@/lib/skills";
import { getPublishedSkills } from "@/lib/store";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const category = searchParams.get("category") || "all";
  const chain = searchParams.get("chain") || "";
  const q = (searchParams.get("q") || "").toLowerCase();

  let skills = [...SKILLS];

  // Also include community-published skills
  const published = getPublishedSkills();
  const communitySkills = published.map((p) => ({
    id: p.id,
    name: p.name,
    emoji: "🔧",
    tagline: p.description.slice(0, 80),
    description: p.description,
    category: p.category as never,
    chains: p.chains as never,
    priceDisplay: p.priceDisplay,
    priceBaseUnits: String(Math.round(Number(p.priceDisplay) * 1_000_000)),
    callCount: p.callCount,
    rating: 0,
    ratingCount: 0,
    okxDependencies: p.okxDependencies,
    inputSchema: {},
    outputExample: {}
  }));

  const allSkills = [...skills, ...communitySkills];

  let result = allSkills;
  if (category !== "all") {
    result = result.filter((s) => s.category.toLowerCase() === category.toLowerCase());
  }
  if (chain) {
    result = result.filter((s) =>
      (s.chains as string[]).some((c) => c.toLowerCase().includes(chain.toLowerCase()))
    );
  }
  if (q) {
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (s.okxDependencies || []).some((d) => d.toLowerCase().includes(q))
    );
  }

  return NextResponse.json({
    skills: result.map((s) => ({
      id: s.id,
      name: s.name,
      emoji: s.emoji,
      tagline: s.tagline,
      category: s.category,
      chains: s.chains,
      priceDisplay: s.priceDisplay,
      priceBaseUnits: s.priceBaseUnits,
      callCount: s.callCount,
      rating: s.rating,
      ratingCount: s.ratingCount,
      badge: (s as { badge?: string }).badge,
      okxDependencies: s.okxDependencies,
      invokeUrl: `/api/skills/${s.id}/invoke`
    })),
    total: result.length,
    freeTrial: process.env.FREE_UNTIL
      ? Date.now() < Number(process.env.FREE_UNTIL) * 1000
      : process.env.NODE_ENV === "development"
  });
}
