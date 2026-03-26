import crypto from "crypto";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createSessionToken,
  makeSessionExpiry,
  sanitizeUser
} from "@/lib/auth";
import {
  extractPrivyIdentity,
  getPrivyClient,
  isPrivyServerConfigured
} from "@/lib/privy";
import { updateDb, type UserAccount } from "@/lib/store";

export const runtime = "nodejs";

function normalizeWalletAddress(value: unknown) {
  const address = String(value || "").trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(address)) return undefined;
  return address;
}

export async function POST(request: Request) {
  if (!isPrivyServerConfigured()) {
    return NextResponse.json(
      { error: "Privy server env is missing. Set PRIVY_APP_ID and PRIVY_APP_SECRET." },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const accessToken = String(body.accessToken || "").trim();
  const requestedWalletAddress = normalizeWalletAddress(body.walletAddress);
  if (!accessToken) {
    return NextResponse.json({ error: "accessToken is required." }, { status: 400 });
  }

  const privy = getPrivyClient();

  let privyUserId = "";
  try {
    const claims = await privy.verifyAuthToken(accessToken);
    privyUserId = claims.userId;
  } catch {
    return NextResponse.json({ error: "Invalid Privy access token." }, { status: 401 });
  }

  const privyUser = await privy.getUser(privyUserId).catch(() => null);
  if (!privyUser) {
    return NextResponse.json({ error: "Unable to load Privy user." }, { status: 401 });
  }

  const identity = extractPrivyIdentity(privyUser);
  const walletAddress = requestedWalletAddress || identity.walletAddress;
  const token = createSessionToken();
  const expiresAt = makeSessionExpiry();
  let currentUser: UserAccount | null = null;

  await updateDb((db) => {
    const now = new Date().toISOString();
    let user =
      db.users.find((item) => item.privyUserId === identity.privyUserId) ||
      db.users.find(
        (item) => Boolean(identity.walletAddress) && item.walletAddress === identity.walletAddress
      ) ||
      null;

    if (!user) {
      user = {
        id: crypto.randomUUID(),
        email: identity.email,
        passwordHash: "__privy__",
        createdAt: now,
        authProvider: "privy",
        privyUserId: identity.privyUserId,
        walletAddress
      };
      db.users.unshift(user);
    } else {
      user.email = identity.email;
      user.authProvider = "privy";
      user.privyUserId = identity.privyUserId;
      if (walletAddress) {
        user.walletAddress = walletAddress;
      }
      if (!user.passwordHash) {
        user.passwordHash = "__privy__";
      }
    }

    db.sessions = db.sessions.filter(
      (session) => session.userId !== user.id && +new Date(session.expiresAt) > Date.now()
    );
    db.sessions.unshift({
      id: crypto.randomUUID(),
      userId: user.id,
      token,
      createdAt: now,
      expiresAt
    });

    currentUser = user;
  });

  if (!currentUser) {
    return NextResponse.json({ error: "Unable to create session." }, { status: 500 });
  }

  const response = NextResponse.json({
    user: sanitizeUser(currentUser),
    walletAddress: walletAddress || null
  });

  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt)
  });
  return response;
}
