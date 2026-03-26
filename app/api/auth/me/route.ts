import { NextResponse } from "next/server";
import { getAuthContext, sanitizeUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await getAuthContext(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return NextResponse.json({
    user: sanitizeUser(auth.user)
  });
}
