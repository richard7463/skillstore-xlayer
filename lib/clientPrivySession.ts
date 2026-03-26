"use client";

type SessionSyncOptions = {
  authenticated: boolean;
  getAccessToken: () => Promise<string | null | undefined>;
  walletAddress?: string;
};

export async function refreshPrivyServerSession({
  authenticated,
  getAccessToken,
  walletAddress
}: SessionSyncOptions) {
  if (!authenticated) return false;

  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return false;

    const response = await fetch("/api/auth/privy/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(walletAddress ? { accessToken, walletAddress } : { accessToken })
    });

    return response.ok;
  } catch {
    return false;
  }
}
