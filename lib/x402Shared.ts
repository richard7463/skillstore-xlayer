export const XLAYER_CAIP2_NETWORK = "eip155:196";
export const XLAYER_CHAIN_ID = 196;
export const X402_VERSION = 1;
export const X402_PAYMENT_HEADER = "X-PAYMENT";
export const X402_PAYMENT_RESPONSE_HEADER = "X-PAYMENT-RESPONSE";
export const X402_SCHEME = "exact";

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
  nonce: `0x${string}` | string;
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

export const transferWithAuthorizationTypes = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" }
  ]
} as const;

function toBase64(input: string): string {
  if (typeof globalThis.btoa === "function") {
    return globalThis.btoa(input);
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(input, "utf8").toString("base64");
  }
  throw new Error("Base64 encoding is not available in this environment.");
}

function fromBase64(input: string): string {
  if (typeof globalThis.atob === "function") {
    return globalThis.atob(input);
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(input, "base64").toString("utf8");
  }
  throw new Error("Base64 decoding is not available in this environment.");
}

function createNonce(): `0x${string}` {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Secure randomness is not available in this environment.");
  }
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes, (item) => item.toString(16).padStart(2, "0")).join("")}`;
}

export function encodeBase64Json(value: unknown): string {
  return toBase64(JSON.stringify(value));
}

export function decodeBase64Json<T>(value: string): T {
  return JSON.parse(fromBase64(value)) as T;
}

export function encodeX402PaymentHeader(payment: X402PaymentPayload): string {
  return encodeBase64Json(payment);
}

export function decodeX402PaymentHeader(header: string): X402PaymentPayload {
  return decodeBase64Json<X402PaymentPayload>(header);
}

export function formatBaseUnits(amount: string, decimals = 6): string {
  const raw = String(amount || "").trim();
  if (!/^\d+$/.test(raw)) return raw;
  const padded = raw.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals) || "0";
  const fraction = padded.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

export function createUnsignedX402Payment(input: {
  from: string;
  requirement: X402Requirement;
  nowSeconds?: number;
}): X402PaymentPayload {
  const nowSeconds = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const validAfter = String(Math.max(0, nowSeconds - 600));
  const validBefore = String(nowSeconds + Math.max(60, input.requirement.maxTimeoutSeconds));

  return {
    x402Version: X402_VERSION,
    scheme: X402_SCHEME,
    network: input.requirement.network,
    payload: {
      signature: "",
      authorization: {
        from: input.from,
        to: input.requirement.payTo,
        value: input.requirement.maxAmountRequired,
        validAfter,
        validBefore,
        nonce: createNonce()
      }
    }
  };
}

export function buildTransferWithAuthorizationTypedData(
  requirement: X402Requirement,
  authorization: X402Authorization
) {
  const extra = requirement.extra || {};
  const domain: {
    name: string;
    chainId: number;
    verifyingContract: `0x${string}`;
    version?: string;
  } = {
    name: String(extra.name || extra.symbol || "USD₮0"),
    chainId: XLAYER_CHAIN_ID,
    verifyingContract: requirement.asset as `0x${string}`
  };
  const version = String(extra.version || "").trim();
  if (version) {
    domain.version = version;
  }

  return {
    domain,
    types: transferWithAuthorizationTypes,
    primaryType: "TransferWithAuthorization" as const,
    message: {
      from: authorization.from,
      to: authorization.to,
      value: authorization.value,
      validAfter: authorization.validAfter,
      validBefore: authorization.validBefore,
      nonce: authorization.nonce
    }
  };
}

