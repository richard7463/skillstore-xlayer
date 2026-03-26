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
  paymentMode: "free_trial" | "x402" | "x402_verified";
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

type Store = {
  logs: InvokeLog[];
  published: PublishedSkill[];
  totalInvocations: number;
};

const DATA_FILE =
  process.env.NODE_ENV === "production"
    ? "/tmp/skillstore-data.json"
    : path.join(process.cwd(), ".skillstore-data.json");

function readStore(): Store {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return { logs: [], published: [], totalInvocations: 0 };
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
