// x402 implementation for X Layer (Chain ID 196)
// Aligned with ai2human/OmniClaw x402 flow

import crypto from "crypto";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  formatUnits,
  getAddress,
  http,
  isAddress,
  parseSignature,
  verifyTypedData,
  type Hash
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  XLAYER_CAIP2_NETWORK,
  XLAYER_CHAIN_ID,
  X402_SCHEME,
  X402_VERSION,
  buildTransferWithAuthorizationTypedData,
  decodeX402PaymentHeader,
  encodeBase64Json,
  formatBaseUnits,
  type X402Challenge,
  type X402PaymentPayload,
  type X402Requirement
} from "./x402Shared";

export type { X402Challenge, X402Requirement, X402PaymentPayload } from "./x402Shared";

const DEFAULT_XLAYER_RPC_URL = "https://xlayer.drpc.org";
const DEFAULT_XLAYER_EXPLORER_URL = "https://www.oklink.com/xlayer";

const DEFAULT_USDT0 = {
  symbol: "USDT0",
  address: "0x779ded0c9e1022225f8e0630b35a9b54be713736",
  decimals: 6,
  name: "USD₮0",
  version: ""
};

const DEFAULT_USDC = {
  symbol: "USDC",
  address: "0x74b7f16337b8972027f6196a17a631ac6de26d22",
  decimals: 6,
  name: "USD Coin",
  version: "2"
};

const transferWithAuthorizationAbi = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "transferWithAuthorization",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" }
    ],
    outputs: []
  }
] as const;

export type X402Settlement = {
  amount: string;
  amountBaseUnits: string;
  payerAddress: string;
  receiverAddress: string;
  tokenSymbol: string;
  tokenAddress: string;
  txHash: string;
  explorerUrl: string;
  network: "xlayer-mainnet";
  chainId: number;
  paymentResponseHeader: string;
};

function normalizePrivateKey(value: string): `0x${string}` {
  return (value.startsWith("0x") ? value : `0x${value}`) as `0x${string}`;
}

function normalizeExplorerBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function buildExplorerUrl(baseUrl: string, txHash: string): string {
  if (baseUrl.includes("{txHash}")) {
    return baseUrl.replace("{txHash}", txHash);
  }
  return `${normalizeExplorerBaseUrl(baseUrl)}/tx/${txHash}`;
}

function resolveDefaultAsset() {
  const preferred = String(process.env.XLAYER_X402_TOKEN || "USDT0").trim().toUpperCase();
  if (preferred === "USDC") return DEFAULT_USDC;
  return DEFAULT_USDT0;
}

function safeAddress(value: string, fallback = "") {
  if (isAddress(value)) return getAddress(value);
  if (fallback && isAddress(fallback)) return getAddress(fallback);
  return "";
}

function createChain(rpcUrl: string, explorerBaseUrl: string) {
  return defineChain({
    id: XLAYER_CHAIN_ID,
    name: "X Layer",
    nativeCurrency: {
      name: "OKB",
      symbol: "OKB",
      decimals: 18
    },
    rpcUrls: {
      default: {
        http: [rpcUrl]
      }
    },
    blockExplorers: {
      default: {
        name: "X Layer Explorer",
        url: explorerBaseUrl
      }
    }
  });
}

function getX402Config() {
  const defaultAsset = resolveDefaultAsset();
  const rpcUrl = String(process.env.XLAYER_RPC_URL || DEFAULT_XLAYER_RPC_URL).trim();
  const explorerBaseUrl = normalizeExplorerBaseUrl(
    String(process.env.XLAYER_EXPLORER_BASE_URL || DEFAULT_XLAYER_EXPLORER_URL).trim()
  );
  const privateKey = String(
    process.env.XLAYER_X402_PRIVATE_KEY || process.env.XLAYER_SETTLEMENT_PRIVATE_KEY || ""
  ).trim();
  const facilitatorAccount = privateKey ? privateKeyToAccount(normalizePrivateKey(privateKey)) : null;
  const rawAssetAddress = String(
    process.env.XLAYER_X402_ASSET_ADDRESS || defaultAsset.address
  ).trim();
  const rawPayTo = String(
    process.env.XLAYER_X402_PAY_TO_ADDRESS ||
      process.env.XLAYER_SETTLEMENT_TO_ADDRESS ||
      process.env.XLAYER_PAY_TO_ADDRESS ||
      facilitatorAccount?.address ||
      ""
  ).trim();
  const assetAddress = safeAddress(rawAssetAddress, defaultAsset.address);
  const payTo = safeAddress(rawPayTo, facilitatorAccount?.address || "");
  const symbol = String(process.env.XLAYER_X402_SYMBOL || defaultAsset.symbol).trim();
  const decimalsRaw = Number(process.env.XLAYER_X402_DECIMALS || defaultAsset.decimals);
  const decimals =
    Number.isFinite(decimalsRaw) && Number.isInteger(decimalsRaw) && decimalsRaw >= 0
      ? decimalsRaw
      : defaultAsset.decimals;
  const name = String(process.env.XLAYER_X402_TOKEN_NAME || defaultAsset.name).trim();
  const version = String(process.env.XLAYER_X402_TOKEN_VERSION || defaultAsset.version).trim();

  const enabled =
    Boolean(privateKey) && Boolean(facilitatorAccount) && Boolean(assetAddress) && Boolean(payTo);

  return {
    enabled,
    rpcUrl,
    explorerBaseUrl,
    privateKey,
    facilitatorAccount,
    assetAddress,
    payTo,
    symbol,
    decimals,
    name,
    version
  };
}

export const XLAYER_CAIP2 = XLAYER_CAIP2_NETWORK;
export const USDT0 = DEFAULT_USDT0;

export const xlayerClient = createPublicClient({
  chain: createChain(
    String(process.env.XLAYER_RPC_URL || DEFAULT_XLAYER_RPC_URL).trim(),
    String(process.env.XLAYER_EXPLORER_BASE_URL || DEFAULT_XLAYER_EXPLORER_URL).trim()
  ),
  transport: http()
});

export function getX402ConfigurationHint(): string {
  const config = getX402Config();
  if (config.enabled) {
    return `Configured for local x402 settlement on X Layer using ${config.symbol}.`;
  }
  return "Configure XLAYER_SETTLEMENT_PRIVATE_KEY or XLAYER_X402_PRIVATE_KEY, then fund the facilitator wallet with OKB gas so SkillStore can relay transferWithAuthorization on X Layer.";
}

export function isX402Configured(): boolean {
  return getX402Config().enabled;
}

export function getSkillPaymentAssetSummary(input: {
  priceDisplay: string;
  priceBaseUnits: string;
}) {
  const config = getX402Config();

  return {
    symbol: config.symbol,
    decimals: config.decimals,
    assetAddress: config.assetAddress,
    name: config.name,
    version: config.version || undefined,
    payTo: config.payTo,
    enabled: config.enabled,
    priceLabel: `${input.priceDisplay} ${config.symbol}`,
    priceBaseUnits: input.priceBaseUnits,
    formattedBaseUnits: formatBaseUnits(input.priceBaseUnits, config.decimals)
  };
}

// Build the x402 challenge (402 response body) for a skill invocation
export function buildSkillChallenge(input: {
  skillId: string;
  skillName: string;
  priceBaseUnits: string;
  priceDisplay: string;
  resource: string;
  payTo?: string;
}): X402Challenge {
  const config = getX402Config();
  const asset = config.assetAddress || DEFAULT_USDT0.address;
  const symbol = config.symbol || DEFAULT_USDT0.symbol;
  const decimals = config.decimals ?? DEFAULT_USDT0.decimals;
  const name = config.name || DEFAULT_USDT0.name;
  const version = config.version || "";
  const payTo = safeAddress(input.payTo || config.payTo, config.payTo);

  return {
    x402Version: X402_VERSION,
    accepts: [
      {
        scheme: X402_SCHEME,
        network: XLAYER_CAIP2_NETWORK,
        maxAmountRequired: input.priceBaseUnits,
        resource: input.resource,
        description: `Invoke ${input.skillName} skill — ${input.priceDisplay} ${symbol} on X Layer`,
        mimeType: "application/json",
        payTo,
        maxTimeoutSeconds: 300,
        asset,
        extra: {
          symbol,
          decimals,
          name,
          version,
          displayAmount: input.priceDisplay,
          skillId: input.skillId,
          resourceType: "skill_invocation"
        }
      }
    ]
  };
}

export function decodePaymentHeader(s: string): X402PaymentPayload {
  return decodeX402PaymentHeader(s);
}

function getRequirementFromChallenge(challenge: X402Challenge): X402Requirement {
  const requirement = challenge.accepts?.[0];
  if (!requirement) {
    throw new Error("Missing x402 payment requirement.");
  }
  return requirement;
}

function validatePaymentPayload(payment: X402PaymentPayload, requirement: X402Requirement) {
  if (payment.x402Version !== X402_VERSION) {
    throw new Error(`Unsupported x402 version ${payment.x402Version}.`);
  }

  if (payment.scheme !== X402_SCHEME) {
    throw new Error(`Unsupported x402 scheme ${payment.scheme}.`);
  }

  if (payment.network !== requirement.network) {
    throw new Error(`Unsupported x402 network ${payment.network}.`);
  }

  if (!payment.payload?.signature) {
    throw new Error("Missing x402 signature.");
  }

  const authorization = payment.payload.authorization;
  if (!authorization) {
    throw new Error("Missing x402 authorization payload.");
  }

  if (getAddress(authorization.to) !== getAddress(requirement.payTo)) {
    throw new Error("x402 authorization receiver does not match the challenge payTo address.");
  }

  if (String(authorization.value) !== String(requirement.maxAmountRequired)) {
    throw new Error("x402 authorization amount does not match the required amount.");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const validAfter = Number(authorization.validAfter);
  const validBefore = Number(authorization.validBefore);

  if (!Number.isFinite(validAfter) || validAfter > nowSeconds) {
    throw new Error("x402 authorization is not yet valid.");
  }
  if (!Number.isFinite(validBefore) || validBefore <= nowSeconds) {
    throw new Error("x402 authorization has expired.");
  }
}

async function verifyPaymentSignature(payment: X402PaymentPayload, requirement: X402Requirement) {
  const authorization = payment.payload.authorization;
  const typedData = buildTransferWithAuthorizationTypedData(requirement, authorization);
  const verified = await verifyTypedData({
    address: getAddress(authorization.from),
    domain: typedData.domain,
    types: typedData.types,
    primaryType: typedData.primaryType,
    message: {
      from: getAddress(authorization.from),
      to: getAddress(authorization.to),
      value: BigInt(authorization.value),
      validAfter: BigInt(authorization.validAfter),
      validBefore: BigInt(authorization.validBefore),
      nonce: authorization.nonce as `0x${string}`
    },
    signature: payment.payload.signature as `0x${string}`
  });

  if (!verified) {
    throw new Error("x402 signature verification failed.");
  }
}

// Validate structure + semantics + signature without executing settlement.
export async function validatePaymentStructure(payment: X402PaymentPayload, requirement: X402Requirement) {
  validatePaymentPayload(payment, requirement);
  await verifyPaymentSignature(payment, requirement);
  return true as const;
}

export async function settleSkillInvocationPayment(input: {
  paymentHeader: string;
  challenge: X402Challenge;
}): Promise<X402Settlement> {
  const config = getX402Config();
  if (!config.enabled || !config.facilitatorAccount) {
    throw new Error(getX402ConfigurationHint());
  }

  const requirement = getRequirementFromChallenge(input.challenge);
  const payment = decodeX402PaymentHeader(input.paymentHeader);
  validatePaymentPayload(payment, requirement);
  await verifyPaymentSignature(payment, requirement);

  const chain = createChain(config.rpcUrl, config.explorerBaseUrl);
  const publicClient = createPublicClient({
    chain,
    transport: http(config.rpcUrl)
  });
  const walletClient = createWalletClient({
    account: config.facilitatorAccount,
    chain,
    transport: http(config.rpcUrl)
  });

  const { v, r, s } = parseSignature(payment.payload.signature as `0x${string}`);
  const authorization = payment.payload.authorization;
  if (!r || !s || v === undefined || v === null) {
    throw new Error("Invalid x402 signature payload.");
  }

  const txHash = await walletClient.writeContract({
    address: requirement.asset as `0x${string}`,
    abi: transferWithAuthorizationAbi,
    functionName: "transferWithAuthorization",
    args: [
      authorization.from as `0x${string}`,
      authorization.to as `0x${string}`,
      BigInt(authorization.value),
      BigInt(authorization.validAfter),
      BigInt(authorization.validBefore),
      authorization.nonce as `0x${string}`,
      Number(v),
      r,
      s
    ]
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    throw new Error("x402 settlement transaction did not succeed.");
  }

  return {
    amount: formatUnits(BigInt(authorization.value), Number(requirement.extra?.decimals || config.decimals)),
    amountBaseUnits: String(authorization.value),
    payerAddress: getAddress(authorization.from),
    receiverAddress: getAddress(authorization.to),
    tokenSymbol: String(requirement.extra?.symbol || config.symbol),
    tokenAddress: getAddress(requirement.asset),
    txHash,
    explorerUrl: buildExplorerUrl(config.explorerBaseUrl, txHash),
    network: "xlayer-mainnet",
    chainId: XLAYER_CHAIN_ID,
    paymentResponseHeader: encodeBase64Json({
      method: "x402_exact",
      txHash,
      payer: getAddress(authorization.from),
      amount: String(authorization.value),
      tokenSymbol: String(requirement.extra?.symbol || config.symbol),
      network: XLAYER_CAIP2_NETWORK
    })
  };
}

export type OnchainVerifyResult = {
  verified: boolean;
  txHash: string;
  from: string;
  to: string;
  amount: string;
  amountRaw: string;
  blockNumber: string;
  explorerUrl: string;
};

/**
 * Verify a real ERC-20 Transfer on X Layer mainnet.
 * Looks up the txHash and confirms:
 *   - tx succeeded
 *   - contains a Transfer(from, payTo, value) log for the configured asset
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

  const config = getX402Config();
  const settlementAsset = getAddress(config.assetAddress || DEFAULT_USDT0.address).toLowerCase() as `0x${string}`;
  const toAddr = expectedTo.toLowerCase();

  let matchedLog: { from: string; to: string; value: bigint } | null = null;

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== settlementAsset) continue;
    if (!log.topics[0]) continue;
    const transferSig =
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    if (log.topics[0].toLowerCase() !== transferSig) continue;
    const logTo = log.topics[2] ? `0x${log.topics[2].slice(26)}` : "";
    if (logTo.toLowerCase() !== toAddr) continue;
    const logFrom = log.topics[1] ? `0x${log.topics[1].slice(26)}` : "";
    const value = BigInt(log.data);

    if (value >= BigInt(requiredBaseUnits)) {
      matchedLog = { from: logFrom, to: logTo, value };
      break;
    }
  }

  if (!matchedLog) {
    throw new Error(
      `No matching ${config.symbol} Transfer(→${expectedTo}, ≥${requiredBaseUnits}) found in TX ${txHash}`
    );
  }

  return {
    verified: true,
    txHash,
    from: matchedLog.from,
    to: matchedLog.to,
    amount: `${formatUnits(matchedLog.value, config.decimals)} ${config.symbol}`,
    amountRaw: matchedLog.value.toString(),
    blockNumber: receipt.blockNumber.toString(),
    explorerUrl: buildExplorerUrl(config.explorerBaseUrl, txHash)
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
