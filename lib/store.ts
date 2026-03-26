// In-memory store for invocation logs and published skills
// Uses /tmp on Vercel, in-memory locally

import fs from "fs";
import path from "path";
import crypto from "crypto";

export type InvokeLog = {
  id: string;
  skillId: string;
  skillName: string;
  invokedAt: string;
  paymentMode: "free_trial" | "x402" | "x402_verified" | "x402_exact";
  txHash?: string;
  payerAddress?: string;
  priceDisplay: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  auditId: string;
  network: "xlayer-mainnet" | "demo";
};

export type PublishedSkill = {
  id: string;
  name: string;
  description: string;
  category: string;
  priceDisplay: string;
  chains: string[];
  okxDependencies: string[];
  publisherAddress: string;
  publishedAt: string;
  callCount: number;
};

export type UserAccount = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  authProvider?: "local" | "privy";
  privyUserId?: string;
  walletAddress?: string;
};

export type AuthSession = {
  id: string;
  userId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
};

type Store = {
  logs: InvokeLog[];
  published: PublishedSkill[];
  totalInvocations: number;
  users: UserAccount[];
  sessions: AuthSession[];
};

const DATA_FILE =
  process.env.NODE_ENV === "production"
    ? "/tmp/skillstore-data.json"
    : path.join(process.cwd(), ".skillstore-data.json");

function readStore(): Store {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      logs: parsed.logs || [],
      published: parsed.published || [],
      totalInvocations: parsed.totalInvocations || 0,
      users: parsed.users || [],
      sessions: parsed.sessions || []
    };
  } catch {
    return { logs: [], published: [], totalInvocations: 0, users: [], sessions: [] };
  }
}

function writeStore(store: Store) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
  } catch {
    // ignore write errors in read-only environments
  }
}

export function addInvokeLog(log: Omit<InvokeLog, "id">): InvokeLog {
  const store = readStore();
  const entry: InvokeLog = { id: crypto.randomUUID(), ...log };
  store.logs.unshift(entry);
  if (store.logs.length > 200) store.logs = store.logs.slice(0, 200);
  store.totalInvocations += 1;
  writeStore(store);
  return entry;
}

export function getLogs(limit = 50): InvokeLog[] {
  const store = readStore();
  return store.logs.slice(0, limit);
}

export function getLogsBySkill(skillId: string, limit = 20): InvokeLog[] {
  const store = readStore();
  return store.logs.filter((l) => l.skillId === skillId).slice(0, limit);
}

export function getTotalInvocations(): number {
  const store = readStore();
  return store.totalInvocations || store.logs.length;
}

export function addPublishedSkill(skill: Omit<PublishedSkill, "id" | "publishedAt" | "callCount">): PublishedSkill {
  const store = readStore();
  const entry: PublishedSkill = {
    id: crypto.randomUUID(),
    ...skill,
    publishedAt: new Date().toISOString(),
    callCount: 0
  };
  store.published.unshift(entry);
  writeStore(store);
  return entry;
}

export function getPublishedSkills(): PublishedSkill[] {
  const store = readStore();
  return store.published;
}

export async function readDb(): Promise<Store> {
  return readStore();
}

export async function updateDb(mutator: (draft: Store) => void | Promise<void>) {
  const store = readStore();
  await mutator(store);
  writeStore(store);
  return store;
}
