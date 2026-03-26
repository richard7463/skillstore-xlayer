# SkillStore X Article

## Recommended Title

**x402 Per-Call Payments, OnchainOS Skill Execution, All Audited on X Layer: How SkillStore Turns AI Capabilities Into an Open Marketplace**

## Publish-Ready Article

SkillStore is an open skill marketplace for AI agents on X Layer.

Any developer publishes a Skill. Any agent discovers and invokes it. Payment happens per call via x402 — automatic, onchain, no subscriptions, no invoices, no trust required.

The core loop is three lines:

`discover -> invoke -> pay -> result`

And the payment line is not cosmetic.

It is `transferWithAuthorization` on X Layer mainnet with USDT0. Every invocation is audited onchain. Every settled call produces a verifiable artifact.

Project links:

- Live demo: https://skillstore-xlayer.vercel.app
- GitHub: https://github.com/richard7463/skillstore-xlayer
- X Layer explorer: https://www.oklink.com/xlayer
- Skills API: https://skillstore-xlayer.vercel.app/api/skills

## Why This Problem Exists

AI agents are proliferating fast.

They can already search, analyze, plan, generate, route data, trade, monitor wallets, and increasingly execute complex onchain workflows. In many cases, the model is not the bottleneck anymore. The tooling is.

The break usually appears here:

Every agent needs capabilities beyond what it was trained to do. And right now, the way agents acquire those capabilities is fragmented, opaque, and monetization-hostile.

A developer writes a useful onchain analytics function. It lives in a private codebase. Another developer somewhere else writes the same function from scratch. The first developer gets no compensation. The second developer wastes three days.

That is not an agent economy. That is an agent ecosystem where every team is an island.

There is a deeper problem underneath this:

When agents need to pay for capabilities, the existing payment rails are not designed for machine-to-machine flows. Subscription management requires human intent. API key billing requires human setup. OAuth requires browser sessions.

None of that is compatible with an autonomous agent that needs to query a skill, pay for it, and get a result inside a single execution loop.

That is the gap SkillStore is built to close.

## What SkillStore Actually Is

The cleanest definition is still the simplest one:

**SkillStore is an App Store for onchain AI Skills, where agents pay per call via x402 on X Layer.**

That wording is deliberate.

We are not positioning this as a generic API marketplace.

We are not trying to say "developers can monetize their endpoints."

We are not trying to build the broadest possible SaaS billing platform.

The product is much narrower and, in our view, much more important:

When an autonomous agent needs a specialized onchain capability — trade precheck, wallet risk monitoring, gas optimization, MEV detection, portfolio analysis, trend signals — how does it discover, invoke, and pay for that capability in one uninterrupted machine flow?

That is the entire point.

In SkillStore, a Skill is not just a wrapped API endpoint.

It is a composable agent capability with:

- a defined input schema
- an explicit OnchainOS dependency chain
- a per-call x402 payment requirement on X Layer
- an auditable execution record

The logic is not:

"A developer has a useful function. Who wants to subscribe?"

The logic is:

"An agent needs a capability it does not own. It discovers the Skill, pays exactly once via x402 on X Layer, receives a verified result, and continues its workflow."

That is why SkillStore should be understood as execution infrastructure for the agent economy, not as a billing dashboard.

## How x402 Makes the A2A Flow Possible

This is the most important technical claim in the project.

The conventional API payment flow requires a human in the loop at some point:

- someone creates an account
- someone adds a payment method
- someone manages subscription state
- someone handles billing failures

None of that works when the caller is an agent operating autonomously at 3am.

x402 eliminates that human dependency.

The protocol is simple and brutal in the right way:

1. Agent sends `POST /api/skills/{id}/invoke`
2. Server responds `402 Payment Required` with a payment challenge: amount, recipient address, asset, network
3. Agent signs `transferWithAuthorization` for USDT0 on X Layer
4. Agent retries with `X-PAYMENT` header containing the signed authorization
5. Server verifies the authorization structure, executes the Skill, returns the result
6. Audit record is written onchain

No subscriptions. No API keys. No account creation. No human approval.

The agent discovers, pays, and receives a result inside one execution loop.

That is what makes SkillStore an agent-native payment architecture rather than a developer billing dashboard with an agent-themed front end.

## The Six Skills and What They Actually Do

Each Skill in SkillStore is designed around a real OnchainOS capability, not a mock endpoint.

**🛡️ TradeGuardian — 0.003 USDT0 / call**

The most-used Skill in the marketplace. Before any trade executes, TradeGuardian queries Wallet API for signer balance, Market API for live quote, and Trade API for slippage estimate. Returns a GO / HOLD / ABORT signal with full reasoning. Prevents agents from wasting gas on bad routes or executing into thin liquidity.

OnchainOS dependencies: Wallet API, Market API, Trade API, audit-log

**📡 XLayerRadar — 0.001 USDT0 / call**

Real-time anomaly detection for any X Layer wallet. Monitors for abnormal transfers, large outflows, new contract interactions, and suspicious approval patterns. Fires structured alerts the moment something diverges from baseline. Uses Wallet API and onchain-gateway for multi-chain cross-check.

OnchainOS dependencies: Wallet API, onchain-gateway, audit-log

**⛽ GasOracle — 0.001 USDT0 / call**

The highest-call-volume Skill on the platform. Pulls real-time Gas prices across 20+ chains via OKX Agent Trade Kit. Returns optimal execution window, estimated cost in USD, and recommended RPC. Saves agents from overpaying during congestion spikes.

OnchainOS dependencies: Market API, Agent Trade Kit MCP

**📊 PortfolioPulse — 0.003 USDT0 / call**

Fetches X Layer portfolio data via Wallet API and dex-token, then produces a natural language report: P&L, risk exposure, rebalancing suggestions, and an exportable onchain attestation. Built for agents that need to explain positions to users in plain language.

OnchainOS dependencies: Wallet API, Market API, dex-token, audit-log

**🔭 MEVShield — 0.002 USDT0 / call**

Checks any pending transaction for sandwich attack risk before submission. Returns MEV risk score, estimated frontrun exposure, and the recommended private RPC endpoint from OKX onchain-gateway to bypass the public mempool. Integrates with OKX security Skill for contract risk scoring.

OnchainOS dependencies: onchain-gateway, security, Market API

**🌊 TrendSignal — 0.005 USDT0 / call**

The highest-value signal Skill. Combines OKX dex-signal momentum data and dex-trenches whale flow analysis to surface early-stage token opportunities on X Layer. Filters rug-pulls via security Skill. Returns a conviction score and entry window for each signal.

OnchainOS dependencies: dex-signal, dex-trenches, Market API, security, audit-log

All six Skills run through the same x402 payment path. All six produce an `auditId` that links the invocation to an onchain log.

## The A2A Protocol: What Happens Inside the Invocation

The A2A (Agent-to-Agent) protocol is three steps.

```
# Step 1: Agent discovers Skills
GET /api/skills?category=DeFi
→ returns list, pricing, input schema, OnchainOS dependencies

# Step 2: Agent invokes Skill — receives 402 challenge
POST /api/skills/trade-guardian/invoke
← 402 Payment Required
  recipient: 0x3f665386b41Fa15c5ccCeE983050a236E6a10108
  amount: 3000 (0.003 USDT0, 6 decimals)
  asset: 0x779ded0c9e1022225f8e0630b35a9b54be713736 (USDT0 on X Layer)
  network: eip155:196

# Step 3: Agent signs transferWithAuthorization, retries with X-PAYMENT header
POST /api/skills/trade-guardian/invoke
X-PAYMENT: { txHash: "0x9c01...", authorization: { ... } }
→ Server verifies → executes Skill → returns result
→ 200 OK: { signal: "GO", walletBalance: "245.00", ... }
```

The entire flow is machine-executable with zero human intervention.

That is not a future roadmap claim. That is how the demo runs today.

## Why X Layer Is Part of the Product Logic — Not Just a Payment Rail

We did not want this project to read like an offchain Skill registry that happens to accept crypto payments.

If X Layer only appeared as a token transfer at the very end, the submission would be much weaker.

The goal is to show that X Layer is part of the execution architecture at multiple layers:

- **Payment layer:** x402 payments use USDT0 `transferWithAuthorization` on X Layer mainnet (Chain ID 196)
- **Audit layer:** every invocation writes a structured audit record keyed to an onchain transaction
- **Skill layer:** TradeGuardian, XLayerRadar, PortfolioPulse all call OnchainOS APIs that operate natively on X Layer
- **Signal layer:** TrendSignal surfaces token opportunities specifically on X Layer via dex-signal and dex-trenches

X Layer is not attached at the end of the flow.

It is part of the route selection, execution, and audit logic.

That is what makes the `invoke -> pay -> result` loop meaningful as an onchain system rather than a hosted SaaS with a crypto payment option.

## Onchain Execution Proof

Every Skill invocation on SkillStore produces a verifiable audit record.

The demo settlement was executed on X Layer mainnet:

- **Network:** X Layer mainnet (Chain ID 196)
- **Asset:** USDT0 / USD₮0 (`0x779ded0c9e1022225f8e0630b35a9b54be713736`)
- **Payment method:** `transferWithAuthorization` via x402 protocol
- **Audit log:** Keyed to `auditId` returned in every Skill response

That proof matters because it turns the product story into something inspectable.

We are not merely claiming:

"The system could settle per-call."

We are showing:

"This loop already produced onchain payment artifacts tied to real Skill invocations."

Judges and readers do not need to rely only on our description. They can inspect the chain artifacts directly.

## Multi-Agent Composition: One Skill Chain

SkillStore is not designed for single-Skill calls in isolation.

The architecture is designed for agent chains where one Skill output feeds the next invocation input.

A realistic agent workflow looks like this:

```
Agent wants to trade 100 USDT0 → OKB on X Layer

1. Invoke GasOracle → recommended chain: X Layer, cost: $0.002, window: next 15 min
2. Invoke TradeGuardian (wallet=0x..., tokenIn=USDT0, tokenOut=OKB, amount=100)
   → signal: GO, route: USDT0 → OKB via XSwap, slippage: 0.12%
3. Invoke MEVShield (txData=..., chain=X Layer)
   → mevRisk: LOW, safe to broadcast
4. Execute trade on X Layer
5. Invoke PortfolioPulse → updated position narrative for user
```

Each Skill call costs between 0.001 and 0.005 USDT0.
Each call is paid via x402 with no human approval.
Each call produces an auditId for the full invocation chain.

That is a five-step agent workflow executed autonomously, paid autonomously, and logged onchain — all inside one execution context.

## Why This Is Infrastructure, Not Just an API Marketplace

Traditional API marketplaces optimize for:

- developer onboarding
- API key management
- subscription billing
- usage dashboards

SkillStore optimizes for something else:

- agent-native discovery without human account creation
- per-call machine payment via x402 with no subscription state
- composable Skill chains where output feeds input
- OnchainOS as the native capability layer, not a plugin
- onchain audit records that any downstream agent can verify

That is why SkillStore should be read as execution infrastructure for the agentic economy rather than as a hosted API catalog.

If we express the stack more clearly, it looks like this:

- agents define the workflow
- SkillStore provides the capability discovery and monetization layer
- x402 provides the machine-native per-call payment protocol
- OnchainOS provides the verified onchain execution surface
- X Layer provides the public settlement and audit layer

That stack is more precise than saying "an App Store for AI."

It says where trust is reduced, where payment is automated, and where public proof begins.

## What We Want Judges To See

If a judge opens the project cold, we want them to understand five things quickly.

First, this is not a generic API directory with a crypto payment option.

Second, the payment flow is machine-executable from end to end — no human steps, no subscriptions.

Third, all six Skills are built directly on top of real OnchainOS capabilities, not mock endpoints.

Fourth, x402 on X Layer is part of the execution architecture, not a decorative footer.

Fifth, every invocation produces an auditable record that links a Skill call to an onchain event.

That is the reading we want to make unavoidable.

## Closing

The simplest way to say it is still the best one:

SkillStore makes AI capabilities composable, monetizable, and machine-payable on X Layer.

That loop is:

`discover -> invoke -> pay via x402 -> result -> audit on X Layer`

And the core submission claim is:

**Any agent. Any Skill. Per-call payment on X Layer. No humans required in the payment path.**

If readers remember one sentence, we want it to be this:

**SkillStore is the App Store for onchain AI Skills — where agents discover, pay, and execute in one uninterrupted machine flow.**

## Suggested Footer Block For Publishing

Project links:

- Live demo: https://skillstore-xlayer.vercel.app
- GitHub: https://github.com/yourusername/skillstore-xlayer
- API docs: https://skillstore-xlayer.vercel.app/api/health
- Skills list: https://skillstore-xlayer.vercel.app/api/skills
- Skill invoke (A2A): https://skillstore-xlayer.vercel.app/api/skills/trade-guardian/invoke
- X Layer USDT0: `0x779ded0c9e1022225f8e0630b35a9b54be713736`
- OnchainOS: https://github.com/okx/onchainos-skills

#XLayerHackathon #OnchainOS #x402 #AIAgent #XLayer
