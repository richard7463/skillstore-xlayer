import { NextResponse } from "next/server";
import { SESSION_COOKIE, clearSessionByToken, extractSessionToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = extractSessionToken(request);
  await clearSessionByToken(token);

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0)
  });
  return response;
}
