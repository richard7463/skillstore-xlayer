import { NextRequest, NextResponse } from "next/server";
import { addPublishedSkill } from "@/lib/store";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const required = ["name", "description", "category", "priceDisplay", "chains", "okxDependencies", "publisherAddress"];
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json({ error: `Missing field: ${field}` }, { status: 400 });
    }
  }

  const skill = addPublishedSkill({
    name: String(body.name),
    description: String(body.description),
    category: String(body.category),
    priceDisplay: String(body.priceDisplay),
    chains: body.chains as string[],
    okxDependencies: body.okxDependencies as string[],
    publisherAddress: String(body.publisherAddress)
  });

  return NextResponse.json({ ok: true, skill }, { status: 201 });
}
