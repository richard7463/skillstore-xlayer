"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { PrivyProvider, usePrivy, useWallets } from "@privy-io/react-auth";
import { xLayer } from "viem/chains";
import { refreshPrivyServerSession } from "@/lib/clientPrivySession";

type EthereumProvider = {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
};

type SkillStoreWalletContextValue = {
  privyEnabled: boolean;
  ready: boolean;
  authenticated: boolean;
  walletAddress?: string;
  accessTokenReady: boolean;
  login: () => void | Promise<void>;
  logout: () => void | Promise<void>;
  getWalletProvider: () => Promise<EthereumProvider | null>;
};

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";
const privyClientId =
  process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID ||
  process.env.NEXT_PUBLIC_PRIVY_APP_CLIENT_ID;

const noopAsync = async () => {};

const defaultContextValue: SkillStoreWalletContextValue = {
  privyEnabled: false,
  ready: true,
  authenticated: false,
  walletAddress: undefined,
  accessTokenReady: false,
  login: noopAsync,
  logout: noopAsync,
  getWalletProvider: async () => null
};

const SkillStoreWalletContext =
  createContext<SkillStoreWalletContextValue>(defaultContextValue);

function PrivyWalletContextProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, login, logout, getAccessToken, user } = usePrivy();
  const { wallets } = useWallets();
  const wallet =
    wallets.find((item) => item.walletClientType === "privy" && item.address) ||
    wallets.find((item) => item.address) ||
    null;
  const walletAddress =
    wallet?.address || user?.wallet?.address || wallets.find((item) => item.address)?.address;

  useEffect(() => {
    let cancelled = false;

    async function syncSession() {
      if (!ready || !authenticated) return;
      const ok = await refreshPrivyServerSession({
        authenticated,
        getAccessToken,
        walletAddress
      });
      if (cancelled || ok) return;
    }

    void syncSession();
    return () => {
      cancelled = true;
    };
  }, [authenticated, getAccessToken, ready, walletAddress]);

  async function logoutEverywhere() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin"
      });
    } catch {
      // ignore local session cleanup failures
    }
    await Promise.resolve(logout());
  }

  return (
    <SkillStoreWalletContext.Provider
      value={{
        privyEnabled: true,
        ready,
        authenticated,
        walletAddress,
        accessTokenReady: Boolean(getAccessToken),
        login,
        logout: logoutEverywhere,
        getWalletProvider: async () => {
          if (!wallet) return null;
          return (await wallet.getEthereumProvider()) as EthereumProvider;
        }
      }}
    >
      {children}
    </SkillStoreWalletContext.Provider>
  );
}

export default function SkillStoreWalletProvider({
  children
}: {
  children: ReactNode;
}) {
  if (!privyAppId) {
    return (
      <SkillStoreWalletContext.Provider value={defaultContextValue}>
        {children}
      </SkillStoreWalletContext.Provider>
    );
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      clientId={privyClientId}
      config={{
        defaultChain: xLayer,
        supportedChains: [xLayer],
        loginMethods: ["wallet"],
        appearance: {
          theme: "light",
          accentColor: "#f08c49",
          showWalletLoginFirst: true
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "all-users"
          }
        }
      }}
    >
      <PrivyWalletContextProvider>{children}</PrivyWalletContextProvider>
    </PrivyProvider>
  );
}

export function useSkillStoreWallet() {
  return useContext(SkillStoreWalletContext);
}
