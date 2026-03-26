# SkillStore X Article

## Recommended Title

**OnchainOS Skills, x402 Exact Payments, and One Auditable Invoke Loop on X Layer: How SkillStore Turns Agent Capabilities Into Onchain Infrastructure**

## Publish-Ready Article

SkillStore is not a generic API marketplace with a crypto checkout.

SkillStore is an execution layer for agent capabilities on X Layer.

The problem starts when an agent needs a capability it does not own.

Maybe it needs a trade precheck before routing size.
Maybe it needs wallet anomaly detection before taking custody action.
Maybe it needs a gas read across multiple chains before choosing timing.
Maybe it needs a portfolio explanation in plain language after an onchain action completes.

Right now, that capability handoff usually breaks in one of three ways:

- the function lives in a private codebase
- the payment path depends on human subscription setup
- the result comes back without a machine-native settlement receipt

That is not a real agent economy.

That is a world where every team keeps rebuilding the same tools, and where machine-to-machine usage still depends on human billing rails.

SkillStore exists to close that gap.

The simplest way to say it is still the best one:

**SkillStore is the App Store for OnchainOS AI Skills, where agents discover, pay, invoke, and receive results inside one x402-native loop on X Layer.**

And the core loop is:

`discover -> challenge -> authorize -> settle -> execute -> audit`

That wording matters.

We are not trying to say "developers can upload APIs."
We are not trying to build a broad SaaS billing layer.
We are not trying to make a generic endpoint directory look onchain.

The product is narrower and much more useful:

When an agent needs a specialized OnchainOS capability, how does it find that capability, pay exactly once for that invocation, receive the result, and continue execution without leaving an auditable machine flow?

That is the whole point.

Project links:

- Live demo: https://skillstore-xlayer.vercel.app
- GitHub: https://github.com/richard7463/skillstore-xlayer
- Skills API: https://skillstore-xlayer.vercel.app/api/skills
- Health / proof: https://skillstore-xlayer.vercel.app/api/health
- X Layer explorer: https://www.oklink.com/xlayer

## Why This Problem Exists

AI agents are improving quickly.

They can already search, rank, route, summarize, monitor wallets, evaluate markets, and coordinate multi-step actions. In many workflows, the model is no longer the hardest part. Capability access is.

The break usually appears at the exact moment an agent needs a function it was not shipped with.

Today, that usually means:

- finding some API in docs or Discord
- dealing with API keys and dashboard accounts
- attaching a human billing method
- managing monthly subscription state
- hoping the result format is reusable by downstream agents

That is a poor fit for autonomous software.

If the caller is an agent, the payment path should not depend on a human opening a browser.
If the capability is sold per use, the pricing unit should be the invocation itself.
If the result is valuable, the completion should return with a machine-readable receipt.

Without those pieces, "agent monetization" is still mostly a human-admin story.

## What SkillStore Actually Is

The cleanest definition is still the simplest one:

**SkillStore is execution and monetization infrastructure for onchain agent capabilities.**

That definition is deliberate.

A Skill in SkillStore is not just an endpoint listing.

It is a capability unit with:

- a defined input schema
- explicit OnchainOS dependencies
- a per-call price
- an x402 challenge path
- an execution result
- an auditable invoke record

The logic is not:

"A developer has an API. Who wants a subscription?"

The logic is:

"An agent needs a capability it does not own. The system should expose the capability, return a machine-payable challenge, settle exactly one invocation on X Layer, execute the call, and return a result plus receipt."

That is why SkillStore should be read as infrastructure, not as a marketplace skin.

## The Most Important Technical Shift

This is the part we changed to make the product stronger.

The old version only did half of the payment path:

- return a `402 Payment Required` challenge
- validate the signed x402 payload
- optionally inspect a caller-provided transaction hash

That is not enough.

It proves the caller can sign.
It does not prove SkillStore actually completed the x402 settlement loop the way a production buyer or judge would expect.

The current flow now mirrors the `OmniClaw` / `ai2human` approach:

1. Agent requests `POST /api/skills/{id}/invoke?mode=paid`
2. Server returns `402` with challenge details: amount, asset, payTo, network
3. Agent signs `transferWithAuthorization` for USDT0 on X Layer
4. SkillStore facilitator relays `transferWithAuthorization` onchain
5. Server waits for receipt success
6. Server executes the Skill
7. Server returns the result plus `X-PAYMENT-RESPONSE`

That is a much stronger claim than "we accept signed headers."

It says:

**the invoke path itself is payment-settled, receipt-bearing, and auditable on X Layer**

## Why x402 Is on the Critical Path

We did not want x402 to look like a decorative payment footnote.

If a product says "we use x402" but the core experience still depends on off-platform billing or manual setup, then x402 is not really part of the execution architecture.

In SkillStore, x402 sits in the middle of the capability loop:

- discovery happens before invocation
- invocation returns a payment challenge
- settlement happens before execution
- execution returns only after payment is finalized
- the response includes a machine-readable receipt

That ordering matters.

Payment is not detached from usage.
Payment is not deferred into some account dashboard.
Payment is not handled by a human operator after the fact.

Payment is part of the invoke state machine.

That is the part we want builders and judges to notice.

## The Core Loop

The loop is intentionally narrow:

`discover -> challenge -> authorize -> settle -> execute -> audit`

Each step matters.

### Discover

An agent queries the Skill directory and evaluates what capability fits the task.

The listing already tells the agent:

- what the Skill does
- what category it belongs to
- which chains it supports
- which OnchainOS APIs it uses
- what the per-call price is

### Challenge

The server responds with a `402` challenge that defines the payment terms for one invocation.

That includes:

- network
- asset
- recipient
- amount
- timeout
- resource

The system is not asking the agent to negotiate billing.
It is asking the agent to satisfy one exact payment requirement.

### Authorize

The agent signs EIP-3009 `transferWithAuthorization`.

This is not an invoice promise or a later subscription event.
It is an authorization tied to one invocation flow.

### Settle

SkillStore relays the transfer on X Layer and waits for receipt confirmation.

This is the part that moves the project from "payment-aware" to "payment-executing."

### Execute

Only after settlement succeeds does the Skill execute.

That is what makes the payment boundary meaningful.

### Audit

The result returns with an `auditId`, and the settlement response returns with receipt metadata.

That means the invocation can be replayed as a machine action, not just described as one.

## The Six Skills and Why They Matter

We intentionally used Skills that feel operational, not decorative.

The current set includes:

- `TradeGuardian`: Wallet API + Market API + Trade API precheck before a trade
- `XLayerRadar`: wallet anomaly detection and risk signaling
- `GasOracle`: multi-chain gas monitor and execution timing
- `PortfolioPulse`: wallet-to-report capability for user-facing narratives
- `MEVShield`: sandwich-risk check and private routing recommendation
- `TrendSignal`: early token signal detection through OKX data surfaces

These are not random demo endpoints.

They show the categories an agent actually needs in production:

- trade safety
- wallet risk
- execution timing
- explanation
- protection
- signal discovery

That is why SkillStore reads more like a capability layer than a storefront.

## Why OnchainOS Is Part of the Product Logic

We also did not want OnchainOS to appear as a namedrop in the footer.

The Skill layer is built around concrete OnchainOS surfaces:

- Wallet API
- Market API
- Trade API
- dex-signal
- dex-trenches
- dex-token
- onchain-gateway
- security
- audit-log
- Agent Trade Kit MCP

That matters because the marketplace is not selling generic compute.

It is exposing packaged capabilities that sit on top of the OKX OnchainOS stack and can be consumed by other agents as callable units.

That makes the product more defensible and also much easier to judge:

- capability source is clear
- payment rail is clear
- chain is clear
- receipt path is clear

## A Better Way to Think About the Product

The shallow description is:

"A place where developers publish Skills and agents buy them."

The better description is:

"A payment-settled invoke layer for reusable agent capabilities on X Layer."

That framing is stronger because it explains:

- what the unit is: a capability invocation
- what the price unit is: one call
- what the payment protocol is: x402 exact settlement
- what the chain role is: settlement and audit boundary
- what the output is: result plus receipt

That is infrastructure language, not marketplace language.

## What We Want Judges To See

If someone opens the project cold, we want five things to be obvious quickly.

First, this is not a generic API listing site.

Second, the unit of value is a callable Skill, not an account subscription.

Third, x402 is part of the invoke path itself, not a decorative add-on.

Fourth, OnchainOS capabilities are the product surface, not just branding.

Fifth, the result returns inside one auditable loop:

`discover -> challenge -> authorize -> settle -> execute -> audit`

That is the reading we want to make unavoidable.

## Closing

The cleanest way to say it is still the simplest one:

When an agent needs a capability it does not own, SkillStore keeps discovery, payment, execution, and receipt inside one machine-native loop on X Layer.

That loop is:

`discover -> challenge -> authorize -> settle -> execute -> audit`

And the core claim is:

**OnchainOS capabilities first. x402 settlement inline. Exact payment per call. Auditable invoke flow on X Layer.**

If readers remember one sentence, we want it to be this:

**SkillStore is the execution layer that turns agent capabilities into paid, composable, onchain-callable infrastructure.**

## Suggested Footer Block For Publishing

Project links:

- Live demo: https://skillstore-xlayer.vercel.app
- GitHub: https://github.com/richard7463/skillstore-xlayer
- Skills API: https://skillstore-xlayer.vercel.app/api/skills
- Health / proof: https://skillstore-xlayer.vercel.app/api/health
- X Layer explorer: https://www.oklink.com/xlayer
