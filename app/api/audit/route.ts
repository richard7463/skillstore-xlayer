import { NextRequest, NextResponse } from "next/server";
import { getLogs, getTotalInvocations } from "@/lib/store";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limit = Math.min(Number(searchParams.get("limit") || 50), 100);

  const logs = getLogs(limit);
  const total = getTotalInvocations();

  return NextResponse.json({
    logs,
    total,
    note: "All skill invocations are logged here. In production each auditId maps to an OKX audit-log on-chain entry."
  });
}
