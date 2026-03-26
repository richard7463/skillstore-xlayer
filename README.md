# SkillStore — X Layer OnchainOS Skill Marketplace

**SkillStore is the App Store for OnchainOS AI Skills.** Any developer publishes a Skill. Any AI agent discovers and invokes it via **x402** on **X Layer**. Payments are **per-call** (USDT0 / EIP-3009 `transferWithAuthorization`), with an auditable invocation record.

- **Live demo**: https://skillstore-xlayer.vercel.app
- **Skills API**: https://skillstore-xlayer.vercel.app/api/skills
- **Health / proof**: https://skillstore-xlayer.vercel.app/api/health
- **Repo**: https://github.com/richard7463/skillstore-xlayer

## Quickstart

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Configuration

Create `.env.local` (or set env vars in Vercel):

```bash
# x402 payment receiver on X Layer
XLAYER_PAY_TO_ADDRESS=0x3f665386b41Fa15c5ccCeE983050a236E6a10108

# Optional: X Layer RPC for onchain verification
# (defaults to https://xlayer.drpc.org)
XLAYER_RPC_URL=https://xlayer.drpc.org

# Free trial mode — set to Unix timestamp (seconds) for expiry
# Leave unset for always-free in development
FREE_UNTIL=1746057600
```

## x402 / Paid Mode (Agent-to-Agent)

The invoke endpoint reads `X-PAYMENT` (base64 JSON). In paid mode it can optionally verify a real onchain transfer if the payload includes a `txHash`.

High-level flow:

1. Agent calls `POST /api/skills/{id}/invoke`
2. Server returns `402` with an x402 challenge (amount, asset, payTo, network)
3. Agent signs an EIP-3009 `transferWithAuthorization` for USDT0 on X Layer
4. Agent retries with `X-PAYMENT` header

## Proof TX

The demo includes a real X Layer mainnet transaction (see `/api/health`):

`0x9c01ad8dac5f2fa1d77da8e9b3f2a3afbfe539ea68af7f3929d7bf9a5f3f5d67`

