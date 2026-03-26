# SkillStore — X Layer OnchainOS Skill Marketplace

**SkillStore is the App Store for OnchainOS AI Skills.** Any developer publishes a Skill. Any AI agent discovers and invokes it via **x402** on **X Layer**. Payments are **per-call** in **USDT0**, settled with EIP-3009 `transferWithAuthorization`, and returned with an auditable receipt header.

- Live demo: https://skillstore-xlayer.vercel.app
- Skills API: https://skillstore-xlayer.vercel.app/api/skills
- Health / proof: https://skillstore-xlayer.vercel.app/api/health
- Repo: https://github.com/richard7463/skillstore-xlayer

## Quickstart

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Privy Wallet Integration

SkillStore now uses the same wallet pattern as `OmniClaw` / `ai2human`:

- `PrivyProvider` wraps the app
- default chain is X Layer
- login method is wallet-first
- embedded Ethereum wallet can be created on login
- paid x402 invoke uses the Privy wallet provider for EIP-712 signing

Set these public vars to enable the wallet button and Privy login:

```bash
NEXT_PUBLIC_PRIVY_APP_ID=...
# Optional depending on your Privy project config
NEXT_PUBLIC_PRIVY_CLIENT_ID=...
```

To fully mirror `OmniClaw`, also configure the server-side verifier:

```bash
PRIVY_APP_ID=...
PRIVY_APP_SECRET=...
```

`/api/auth/privy/login` verifies the Privy access token server-side, creates a local session cookie, and `/api/auth/me` reads that cookie.

If the public vars are missing, the UI falls back to an injected wallet such as OKX Wallet or MetaMask for local testing.

## Required x402 Configuration

Paid mode now mirrors the `OmniClaw` / `ai2human` flow:

1. Client requests `POST /api/skills/{id}/invoke?mode=paid`
2. Server returns `402 Payment Required` with an x402 challenge
3. Client signs EIP-3009 `transferWithAuthorization`
4. Server-side facilitator relays `transferWithAuthorization` on X Layer
5. Route waits for receipt, executes the Skill, and returns `X-PAYMENT-RESPONSE`

Set these vars in `.env.local` for paid mode:

```bash
XLAYER_X402_PAY_TO_ADDRESS=0x...
XLAYER_X402_PRIVATE_KEY=0x...
XLAYER_RPC_URL=https://xlayer.drpc.org
```

Notes:

- `XLAYER_X402_PRIVATE_KEY` must control a wallet funded with enough `OKB` gas on X Layer.
- `XLAYER_X402_PAY_TO_ADDRESS` is the receiver address embedded in the x402 challenge.
- `FREE_UNTIL` can stay set if you want the free-trial button to remain active; use `?mode=paid` to force the exact-settlement path.

## Free Trial Mode

`FREE_UNTIL` is optional. If it is unset, development mode stays free by default.

```bash
FREE_UNTIL=1746057600
```

The UI exposes both paths:

- `Test Invoke (Free Trial)`
- `Invoke With x402`

## x402 Exact-Settlement Flow

Agent-facing flow:

```bash
# Step 1: request paid mode to receive a 402 challenge
curl -X POST 'http://localhost:3000/api/skills/trade-guardian/invoke?mode=paid' \
  -H "Content-Type: application/json" \
  -d '{"params":{"tokenIn":"USDT0","tokenOut":"OKB","amountIn":"100"}}'

# Step 2: sign transferWithAuthorization offchain
# Step 3: retry with X-PAYMENT header
curl -X POST 'http://localhost:3000/api/skills/trade-guardian/invoke?mode=paid' \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <base64(signed x402 payload)>" \
  -d '{"params":{"tokenIn":"USDT0","tokenOut":"OKB","amountIn":"100"}}'
```

Success response:

- HTTP `200`
- JSON result payload from the Skill
- `payment` object with `payerAddress`, `receiverAddress`, `txHash`, `explorerUrl`
- `X-PAYMENT-RESPONSE` header containing a compact x402 receipt

## Why x402 Was Failing Before

The old implementation only did:

- return a 402 challenge
- validate the signed header structure
- optionally inspect a caller-provided `txHash`

That was not the full `OmniClaw` flow. The current implementation now performs the missing relay step on the server and waits for the X Layer receipt before executing the Skill.

## Proof TX

The demo includes a real X Layer mainnet transaction:

`0x9c01ad8dac5f2fa1d77da8e9b3f2a3afbfe539ea68af7f3929d7bf9a5f3f5d67`
