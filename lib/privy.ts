import { PrivyClient, type User } from "@privy-io/server-auth";

let cachedClient: PrivyClient | null = null;

function getPrivyAppId() {
  return process.env.PRIVY_APP_ID || process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";
}

function getPrivySecret() {
  return process.env.PRIVY_APP_SECRET || "";
}

export function isPrivyServerConfigured() {
  return Boolean(getPrivyAppId() && getPrivySecret());
}

export function getPrivyClient() {
  const appId = getPrivyAppId();
  const appSecret = getPrivySecret();

  if (!appId || !appSecret) {
    throw new Error("Privy server is not configured. Set PRIVY_APP_ID and PRIVY_APP_SECRET.");
  }

  if (!cachedClient) {
    cachedClient = new PrivyClient(appId, appSecret);
  }

  return cachedClient;
}

function normalizeWalletAddress(value: string | undefined) {
  return value ? value.toLowerCase() : undefined;
}

function getWalletAddress(user: User) {
  if (user.wallet?.address) {
    return normalizeWalletAddress(user.wallet.address);
  }

  const wallet = user.linkedAccounts.find((account) => account.type === "wallet");
  if (!wallet || wallet.type !== "wallet") return undefined;
  return normalizeWalletAddress(wallet.address);
}

export type PrivyIdentity = {
  privyUserId: string;
  email: string;
  walletAddress?: string;
};

export function extractPrivyIdentity(user: User): PrivyIdentity {
  const fallback = `${user.id.replace(/[^a-z0-9]/gi, "").slice(-20)}@privy.local`;

  return {
    privyUserId: user.id,
    email: (user.email?.address || fallback).toLowerCase(),
    walletAddress: getWalletAddress(user)
  };
}
