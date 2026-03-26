export type SkillCategory = "DeFi" | "Risk" | "Analytics" | "Wallet" | "Security";
export type SkillChain = "X Layer" | "ETH" | "SOL" | "ARB" | "OP" | "BASE" | "BNB";

export type Skill = {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  category: SkillCategory;
  chains: SkillChain[];
  priceDisplay: string;      // "0.002"
  priceBaseUnits: string;    // in USDT0 micro-units (6 decimals)
  callCount: number;
  rating: number;
  ratingCount: number;
  okxDependencies: string[]; // OnchainOS skills used
  badge?: "Hot" | "New" | "Security" | "Alpha" | "High Freq" | "OKX Pick";
  inputSchema: Record<string, { type: string; description: string; example: unknown }>;
  outputExample: Record<string, unknown>;
};

export const SKILLS: Skill[] = [
  {
    id: "trade-guardian",
    name: "TradeGuardian",
    emoji: "🛡️",
    tagline: "OnchainOS precheck before every trade — Wallet, Market, Trade API in one call",
    description:
      "Queries X Layer Wallet API for signer balance, Market API for live quote, and Trade API for slippage estimate before any trade executes. Returns GO / HOLD / ABORT signal with reasoning. Prevents agents from wasting gas on bad routes.",
    category: "DeFi",
    chains: ["X Layer", "ETH", "ARB"],
    priceDisplay: "0.003",
    priceBaseUnits: "3000",
    callCount: 634,
    rating: 4.9,
    ratingCount: 91,
    badge: "Hot",
    okxDependencies: ["Wallet API", "Market API", "Trade API", "audit-log"],
    inputSchema: {
      wallet: { type: "string", description: "Signer wallet address", example: "0x3f665..." },
      tokenIn: { type: "string", description: "Input token symbol", example: "USDT0" },
      tokenOut: { type: "string", description: "Output token symbol", example: "OKB" },
      amountIn: { type: "string", description: "Amount to trade", example: "100" }
    },
    outputExample: {
      signal: "GO",
      walletBalance: "245.00",
      marketQuote: { price: "18.42", slippage: "0.12%" },
      tradeRoute: "USDT0 → OKB via XSwap",
      auditId: "audit_0x7a3f...",
      recommendation: "Wallet funded, route clean, slippage within 0.5% — proceed."
    }
  },
  {
    id: "xlayer-radar",
    name: "XLayerRadar",
    emoji: "📡",
    tagline: "Real-time X Layer wallet anomaly detection via OnchainOS Wallet API",
    description:
      "Monitors any X Layer wallet for abnormal transfers, large outflows, new contract interactions, and suspicious approval patterns. Fires structured alerts the moment something looks wrong. Uses OnchainOS Wallet API + onchain-gateway for multi-chain cross-check.",
    category: "Risk",
    chains: ["X Layer", "ETH", "ARB"],
    priceDisplay: "0.001",
    priceBaseUnits: "1000",
    callCount: 412,
    rating: 4.8,
    ratingCount: 67,
    badge: "Security",
    okxDependencies: ["Wallet API", "onchain-gateway", "audit-log"],
    inputSchema: {
      wallet: { type: "string", description: "Wallet address to monitor", example: "0x81009..." },
      thresholdUSD: { type: "number", description: "Alert threshold in USD", example: 500 }
    },
    outputExample: {
      alertLevel: "HIGH",
      events: [
        { type: "large_outflow", amount: "5000 USDT0", to: "0xunknown...", timestamp: "2026-03-24T10:22Z" }
      ],
      auditId: "audit_0x9c01...",
      recommendation: "Immediate review recommended — outflow to new address exceeds threshold."
    }
  },
  {
    id: "gas-oracle",
    name: "GasOracle",
    emoji: "⛽",
    tagline: "Multi-chain Gas monitor via OKX Agent Trade Kit — 20+ chains in one call",
    description:
      "Pulls real-time Gas prices across 20+ chains via OKX Agent Trade Kit MCP (119 tools). Returns optimal execution window, estimated cost in USD, and recommended RPC. Saves agents from overpaying during congestion spikes.",
    category: "Analytics",
    chains: ["X Layer", "ETH", "ARB", "OP", "BASE"],
    priceDisplay: "0.001",
    priceBaseUnits: "1000",
    callCount: 1021,
    rating: 4.8,
    ratingCount: 134,
    badge: "High Freq",
    okxDependencies: ["Market API", "Agent Trade Kit MCP"],
    inputSchema: {
      chains: { type: "array", description: "Target chains", example: ["X Layer", "ETH", "ARB"] },
      urgency: { type: "string", description: "low | medium | high", example: "medium" }
    },
    outputExample: {
      recommended: "X Layer",
      estimatedCostUSD: 0.002,
      breakdown: [
        { chain: "X Layer", gasGwei: "0.001", costUSD: 0.002 },
        { chain: "ETH", gasGwei: "12.4", costUSD: 0.84 }
      ],
      window: "next 15 min",
      auditId: "audit_0xb12e..."
    }
  },
  {
    id: "portfolio-pulse",
    name: "PortfolioPulse",
    emoji: "📊",
    tagline: "X Layer wallet portfolio → natural language report via OnchainOS Wallet API",
    description:
      "Fetches X Layer portfolio data via OnchainOS Wallet API and dex-token, then produces a natural language daily report: P&L, risk exposure, rebalancing suggestions, and exportable on-chain attestation. Built for agents that need to explain positions to users in plain language.",
    category: "Analytics",
    chains: ["X Layer", "ETH", "SOL"],
    priceDisplay: "0.003",
    priceBaseUnits: "3000",
    callCount: 187,
    rating: 4.7,
    ratingCount: 44,
    badge: "New",
    okxDependencies: ["Wallet API", "Market API", "dex-token", "audit-log"],
    inputSchema: {
      wallet: { type: "string", description: "Wallet address", example: "0x3f665..." },
      period: { type: "string", description: "24h | 7d | 30d", example: "24h" }
    },
    outputExample: {
      summary: "Portfolio up 3.2% in 24h. Largest gain: OKB +8.1%. USDT0 position healthy at 42% of portfolio.",
      riskScore: "LOW",
      suggestions: ["Consider reducing OKB concentration above 30%"],
      auditId: "audit_0xd445..."
    }
  },
  {
    id: "mev-shield",
    name: "MEVShield",
    emoji: "🔭",
    tagline: "Sandwich attack detection + private RPC routing via onchain-gateway",
    description:
      "Checks pending transaction mempool for sandwich attack risk before submission. Returns MEV risk score, estimated frontrun exposure, and recommended private RPC endpoint from OKX onchain-gateway to bypass public mempool. Integrates with OKX security skill for contract risk scoring.",
    category: "Security",
    chains: ["X Layer", "ETH", "ARB"],
    priceDisplay: "0.002",
    priceBaseUnits: "2000",
    callCount: 298,
    rating: 4.9,
    ratingCount: 56,
    badge: "OKX Pick",
    okxDependencies: ["onchain-gateway", "security", "Market API"],
    inputSchema: {
      txData: { type: "string", description: "Encoded transaction hex", example: "0x..." },
      chain: { type: "string", description: "Target chain", example: "X Layer" }
    },
    outputExample: {
      mevRisk: "LOW",
      score: 12,
      frontrunExposure: "$0.00",
      recommendation: "Safe to broadcast via public RPC.",
      privateRpc: "https://xlayer.drpc.org",
      auditId: "audit_0xf88a..."
    }
  },
  {
    id: "trend-signal",
    name: "TrendSignal",
    emoji: "🌊",
    tagline: "Early token signals from OKX dex-signal + dex-trenches on X Layer",
    description:
      "Combines OKX dex-signal momentum data and dex-trenches whale flow analysis to surface early-stage token opportunities on X Layer and connected chains. Filters rug-pulls via security skill. Returns conviction score + entry window for each signal.",
    category: "DeFi",
    chains: ["X Layer", "ETH", "BASE", "SOL"],
    priceDisplay: "0.005",
    priceBaseUnits: "5000",
    callCount: 94,
    rating: 4.6,
    ratingCount: 28,
    badge: "Alpha",
    okxDependencies: ["dex-signal", "dex-trenches", "Market API", "security", "audit-log"],
    inputSchema: {
      chains: { type: "array", description: "Chains to scan", example: ["X Layer", "ETH"] },
      minScore: { type: "number", description: "Minimum conviction score 0-100", example: 70 }
    },
    outputExample: {
      signals: [
        { token: "0xABC...", symbol: "XTOKEN", score: 84, reason: "Whale accumulation + volume spike 4x", chain: "X Layer" }
      ],
      auditId: "audit_0x2b77..."
    }
  }
];

export function getSkillById(id: string): Skill | undefined {
  return SKILLS.find((s) => s.id === id);
}

export function getSkillsByCategory(category: string): Skill[] {
  if (category === "all") return SKILLS;
  return SKILLS.filter((s) => s.category === category);
}
