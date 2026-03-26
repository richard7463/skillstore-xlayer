// x402 implementation for X Layer (Chain ID 196)
// Ported from ai2human — uses transferWithAuthorization on X Layer mainnet
// Token: USDT0 (0x779ded0c9e1022225f8e0630b35a9b54be713736)

import crypto from "crypto";
import { createPublicClient, http, parseAbiItem, defineChain, type Hash } from "viem";

// X Layer mainnet chain definition
const xlayer = defineChain({
  id: 196,
  name: "X Layer Mainnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    // drpc tends to be more reliable for public reads than rpc.xlayer.tech
    default: { http: [process.env.XLAYER_RPC_URL || "https://xlayer.drpc.org"] }
  },
  blockExplorers: {
    default: { name: "OKLink", url: "https://www.oklink.com/xlayer" }
  }
});

export const xlayerClient = createPublicClient({
  chain: xlayer,
  transport: http()
});

// ERC-20 Transfer event ABI
const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

export const XLAYER_CHAIN_ID = 196;
export const XLAYER_CAIP2 = "eip155:196";
export const X402_VERSION = 1;
export const X402_SCHEME = "exact";

export const USDT0 = {
  symbol: "USDT0",
  name: "USD₮0",
  address: "0x779ded0c9e1022225f8e0630b35a9b54be713736",
  decimals: 6
};

export type X402Requirement = {
  scheme: "exact";
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra?: Record<string, string | number | boolean | null | undefined>;
};

export type X402Challenge = {
  x402Version: number;
  accepts: X402Requirement[];
};

export type X402Authorization = {
  from: string;
  to: string;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: string;
};

export type X402PaymentPayload = {
  x402Version: number;
  scheme: "exact";
  network: string;
  payload: {
    signature: string;
    authorization: X402Authorization;
  };
};

function toBase64(s: string) {
  return typeof Buffer !== "undefined"
    ? Buffer.from(s, "utf8").toString("base64")
    : globalThis.btoa(s);
}
function fromBase64(s: string) {
  return typeof Buffer !== "undefined"
    ? Buffer.from(s, "base64").toString("utf8")
    : globalThis.atob(s);
}

export function encodePaymentHeader(v: unknown) {
  return toBase64(JSON.stringify(v));
}
export function decodePaymentHeader(s: string): X402PaymentPayload {
  return JSON.parse(fromBase64(s)) as X402PaymentPayload;
}

// Build the x402 challenge (402 response body) for a skill invocation
export function buildSkillChallenge(input: {
  skillId: string;
  skillName: string;
  priceBaseUnits: string;
  priceDisplay: string;
  resource: string;
  payTo: string;
}): X402Challenge {
  return {
    x402Version: X402_VERSION,
    accepts: [
      {
        scheme: X402_SCHEME,
        network: XLAYER_CAIP2,
        maxAmountRequired: input.priceBaseUnits,
        resource: input.resource,
        description: `Invoke ${input.skillName} skill — ${input.priceDisplay} USDT0 on X Layer`,
        mimeType: "application/json",
        payTo: input.payTo,
        maxTimeoutSeconds: 300,
        asset: USDT0.address,
        extra: {
          symbol: USDT0.symbol,
          decimals: USDT0.decimals,
          name: USDT0.name,
          displayAmount: input.priceDisplay,
          skillId: input.skillId,
          resourceType: "skill_invocation"
        }
      }
    ]
  };
}

// Validate payment payload structure (no chain call — for demo/free mode)
export function validatePaymentStructure(payment: X402PaymentPayload, requirement: X402Requirement) {
  if (payment.x402Version !== X402_VERSION) throw new Error(`Unsupported x402 version`);
  if (payment.scheme !== X402_SCHEME) throw new Error(`Unsupported scheme`);
  if (payment.network !== requirement.network) throw new Error(`Wrong network`);
  if (!payment.payload?.signature) throw new Error(`Missing signature`);
  const auth = payment.payload.authorization;
  if (!auth) throw new Error(`Missing authorization`);

  const nowSeconds = Math.floor(Date.now() / 1000);
  const validBefore = Number(auth.validBefore);
  if (validBefore <= nowSeconds) throw new Error(`Payment authorization has expired`);

  return true;
}

export type OnchainVerifyResult = {
  verified: boolean;
  txHash: string;
  from: string;
  to: string;
  amount: string;       // human-readable USDT0
  amountRaw: string;    // base units
  blockNumber: string;
  explorerUrl: string;
};

/**
 * Verify a real USDT0 Transfer on X Layer mainnet.
 * Looks up the txHash and confirms:
 *   - tx succeeded
 *   - contains a Transfer(from, payTo, value) log for USDT0
 *   - value >= requiredBaseUnits
 */
export async function verifyOnchainTransfer(
  txHash: string,
  expectedTo: string,
  requiredBaseUnits: string
): Promise<OnchainVerifyResult> {
  let receipt;
  try {
    receipt = await xlayerClient.getTransactionReceipt({ hash: txHash as Hash });
  } catch {
    throw new Error(`TX not found on X Layer: ${txHash}`);
  }

  if (receipt.status !== "success") {
    throw new Error(`TX reverted on X Layer: ${txHash}`);
  }

  // Scan logs for USDT0 Transfer matching (any from → expectedTo, value >= required)
  const usdt0Address = USDT0.address.toLowerCase() as `0x${string}`;
  const toAddr = expectedTo.toLowerCase();

  let matchedLog: { from: string; to: string; value: bigint } | null = null;

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== usdt0Address) continue;
    // topics[0] = keccak256("Transfer(address,address,uint256)")
    if (!log.topics[0]) continue;
    const TRANSFER_SIG = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    if (log.topics[0].toLowerCase() !== TRANSFER_SIG) continue;

    // topics[1] = from (padded), topics[2] = to (padded)
    const logTo = log.topics[2] ? "0x" + log.topics[2].slice(26) : "";
    if (logTo.toLowerCase() !== toAddr) continue;

    const logFrom = log.topics[1] ? "0x" + log.topics[1].slice(26) : "";
    const value = BigInt(log.data);

    if (value >= BigInt(requiredBaseUnits)) {
      matchedLog = { from: logFrom, to: logTo, value };
      break;
    }
  }

  if (!matchedLog) {
    throw new Error(
      `No matching USDT0 Transfer(→${expectedTo}, ≥${requiredBaseUnits}) found in TX ${txHash}`
    );
  }

  const humanAmount = (Number(matchedLog.value) / 1_000_000).toFixed(6);

  return {
    verified: true,
    txHash,
    from: matchedLog.from,
    to: matchedLog.to,
    amount: `${humanAmount} USDT0`,
    amountRaw: matchedLog.value.toString(),
    blockNumber: receipt.blockNumber.toString(),
    explorerUrl: `https://www.oklink.com/xlayer/tx/${txHash}`
  };
}

// Generate an audit ID for on-chain logging
export function generateAuditId(skillId: string, invokedAt: string) {
  return (
    "audit_0x" +
    crypto
      .createHash("sha256")
      .update(`${skillId}:${invokedAt}`)
      .digest("hex")
      .slice(0, 16)
  );
}

// Check if free trial mode is active
export function isFreeTrial(): boolean {
  const until = process.env.FREE_UNTIL;
  if (!until) return process.env.NODE_ENV === "development";
  return Date.now() < Number(until) * 1000;
}

export function freeUntilLabel(): string {
  const until = process.env.FREE_UNTIL;
  if (!until) return "development mode";
  return new Date(Number(until) * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
