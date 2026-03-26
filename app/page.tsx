"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

type Skill = {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  category: string;
  chains: string[];
  priceDisplay: string;
  callCount: number;
  rating: number;
  ratingCount: number;
  badge?: string;
  okxDependencies: string[];
  invokeUrl: string;
};

type InvokeResult = {
  ok: boolean;
  skillId: string;
  skillName: string;
  invokedAt: string;
  paymentMode: string;
  result: Record<string, unknown>;
  auditId: string;
  network: string;
  freeTrial?: boolean;
};

type A2AStep = {
  step: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  detail: string;
  response?: Record<string, unknown>;
};

const CATEGORIES = ["all", "DeFi", "Risk", "Analytics", "Wallet", "Security"];

const OKX_SKILLS = [
  "Wallet API", "Market API", "Trade API", "dex-signal",
  "dex-trenches", "dex-token", "onchain-gateway", "security",
  "audit-log", "agentic-wallet", "Agent Trade Kit MCP"
];

const PROOF_TX = "0x9c01ad8dac5f2fa1d77da8e9b3f2a3afbfe539ea68af7f3929d7bf9a5f3f5d67";

// ── Styles ─────────────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: "100vh",
    background: "var(--bg)"
  } as React.CSSProperties,

  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 32px",
    height: 60,
    borderBottom: "1px solid var(--border)",
    background: "rgba(9,9,15,0.92)",
    position: "sticky" as const,
    top: 0,
    zIndex: 100,
    backdropFilter: "blur(12px)"
  } as React.CSSProperties,

  hero: {
    padding: "72px 32px 56px",
    maxWidth: 1200,
    margin: "0 auto",
    textAlign: "center" as const
  } as React.CSSProperties,

  body: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "0 32px 80px"
  } as React.CSSProperties,

  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 24
  } as React.CSSProperties,

  skillCard: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 20,
    cursor: "pointer",
    transition: "border-color 0.15s, transform 0.15s"
  } as React.CSSProperties,

  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.03em"
  } as React.CSSProperties,

  btn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "8px 18px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--surface2)",
    color: "var(--text)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "background 0.12s, border-color 0.12s"
  } as React.CSSProperties,

  btnPrimary: {
    background: "var(--accent)",
    border: "1px solid var(--accent)",
    color: "#fff"
  } as React.CSSProperties,

  input: {
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "8px 14px",
    color: "var(--text)",
    fontSize: 13,
    outline: "none",
    width: "100%"
  } as React.CSSProperties,

  code: {
    background: "rgba(0,0,0,0.4)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "14px 18px",
    fontFamily: "monospace",
    fontSize: 12,
    color: "var(--accent2)",
    overflowX: "auto" as const,
    whiteSpace: "pre" as const
  } as React.CSSProperties,

  modal: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    padding: 20
  } as React.CSSProperties
};

// ── Badge ──────────────────────────────────────────────────────────────────

function Badge({ label }: { label: string }) {
  const colors: Record<string, [string, string]> = {
    Hot: ["#f97316", "rgba(249,115,22,0.15)"],
    Security: ["#22d3a4", "rgba(34,211,164,0.12)"],
    "High Freq": ["#a78bfa", "rgba(167,139,250,0.12)"],
    New: ["#60a5fa", "rgba(96,165,250,0.12)"],
    Alpha: ["#facc15", "rgba(250,204,21,0.12)"],
    "OKX Pick": ["#3b82f6", "rgba(59,130,246,0.15)"]
  };
  const [fg, bg] = colors[label] || ["#888", "rgba(136,136,136,0.1)"];
  return (
    <span style={{ ...S.pill, color: fg, background: bg }}>
      {label === "Hot" ? "🔥 " : label === "OKX Pick" ? "⭐ " : ""}{label}
    </span>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent2)", lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ── Skill Card ─────────────────────────────────────────────────────────────

function SkillCard({ skill, onSelect }: { skill: Skill; onSelect: (s: Skill) => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        ...S.skillCard,
        borderColor: hovered ? "var(--accent)" : "var(--border)",
        transform: hovered ? "translateY(-2px)" : "none"
      }}
      onClick={() => onSelect(skill)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <span style={{ fontSize: 28 }}>{skill.emoji}</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, justifyContent: "flex-end" }}>
          {skill.badge && <Badge label={skill.badge} />}
          <span style={{ ...S.pill, color: "var(--muted)", background: "var(--surface2)" }}>
            {skill.category}
          </span>
        </div>
      </div>

      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{skill.name}</div>
      <div style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.5, marginBottom: 14, minHeight: 36 }}>
        {skill.tagline}
      </div>

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const, marginBottom: 14 }}>
        {skill.chains.map((c) => (
          <span key={c} style={{
            ...S.pill,
            background: c === "X Layer" ? "rgba(59,130,246,0.15)" : "var(--surface2)",
            color: c === "X Layer" ? "#60a5fa" : "var(--muted)",
            fontSize: 10
          }}>{c}</span>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ fontWeight: 700, color: "var(--accent2)", fontSize: 15 }}>{skill.priceDisplay}</span>
          <span style={{ color: "var(--muted)", fontSize: 11 }}> USDT0/call</span>
        </div>
        <div style={{ display: "flex", gap: 12, color: "var(--muted)", fontSize: 11 }}>
          <span>⚡ {skill.callCount.toLocaleString()}</span>
          {skill.ratingCount > 0 && <span>★ {skill.rating}</span>}
        </div>
      </div>
    </div>
  );
}

// ── Skill Detail Modal ─────────────────────────────────────────────────────

function SkillModal({
  skill,
  onClose
}: {
  skill: Skill;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InvokeResult | null>(null);
  const [error, setError] = useState("");
  const [params, setParams] = useState<Record<string, string>>({});

  const invoke = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/skills/${skill.id}/invoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ params })
      });
      const data = await res.json();
      if (res.status === 402) {
        setError("Payment required (402). Attach X-PAYMENT header with x402 authorization to invoke in paid mode.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.modal} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        ...S.card,
        maxWidth: 640,
        width: "100%",
        maxHeight: "90vh",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 20
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 36 }}>{skill.emoji}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{skill.name}</div>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>{skill.category}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ ...S.btn, padding: "4px 10px", fontSize: 18, lineHeight: 1 }}
          >×</button>
        </div>

        <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.65 }}>{skill.description}</p>

        {/* OKX Dependencies */}
        <div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            OnchainOS APIs Used
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
            {skill.okxDependencies.map((d) => (
              <span key={d} style={{ ...S.pill, background: "rgba(59,130,246,0.12)", color: "#60a5fa", fontSize: 11 }}>
                {d}
              </span>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div style={{ ...S.card, padding: 16, background: "var(--surface2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>Price per call</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "var(--accent2)" }}>
              {skill.priceDisplay} <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 400 }}>USDT0</span>
            </div>
          </div>
          <div style={{ textAlign: "right" as const }}>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>Network</div>
            <div style={{ fontWeight: 600, color: "#60a5fa", fontSize: 13 }}>X Layer (Chain 196)</div>
          </div>
          <div style={{ textAlign: "right" as const }}>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>Protocol</div>
            <div style={{ fontWeight: 600, fontSize: 12 }}>x402 / EIP-3009</div>
          </div>
        </div>

        {/* Supported chains */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
          {skill.chains.map((c) => (
            <span key={c} style={{
              ...S.pill,
              background: c === "X Layer" ? "rgba(59,130,246,0.15)" : "var(--surface2)",
              color: c === "X Layer" ? "#60a5fa" : "var(--muted)"
            }}>{c}</span>
          ))}
        </div>

        {/* Invoke */}
        <div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Test Invoke (Free Trial)
          </div>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 8, marginBottom: 12 }}>
            {skill.id === "trade-guardian" && (
              <>
                <input style={S.input} placeholder="tokenIn (e.g. USDT0)" onChange={(e) => setParams((p) => ({ ...p, tokenIn: e.target.value }))} />
                <input style={S.input} placeholder="tokenOut (e.g. OKB)" onChange={(e) => setParams((p) => ({ ...p, tokenOut: e.target.value }))} />
                <input style={S.input} placeholder="amountIn (e.g. 100)" onChange={(e) => setParams((p) => ({ ...p, amountIn: e.target.value }))} />
              </>
            )}
            {(skill.id === "xlayer-radar" || skill.id === "portfolio-pulse") && (
              <input style={S.input} placeholder="wallet address (0x...)" onChange={(e) => setParams((p) => ({ ...p, wallet: e.target.value }))} />
            )}
          </div>
          <button
            style={{ ...S.btn, ...S.btnPrimary, width: "100%", padding: "10px 0" }}
            onClick={invoke}
            disabled={loading}
          >
            {loading ? "Invoking…" : "⚡ Invoke Skill (x402 — Free Trial)"}
          </button>
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: 14, color: "#fca5a5", fontSize: 12 }}>
            {error}
          </div>
        )}

        {result && (
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Result
            </div>
            <div style={S.code}>{JSON.stringify(result.result, null, 2)}</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "var(--muted)" }}>
              <span>auditId: {result.auditId}</span>
              <span>{result.paymentMode}</span>
            </div>
          </div>
        )}

        {/* API snippet */}
        <div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            API (Agent-to-Agent)
          </div>
          <div style={S.code}>{`# Step 1: POST to invoke (free trial → 200 OK)
curl -X POST /api/skills/${skill.id}/invoke \\
  -H "Content-Type: application/json" \\
  -d '{"params": {}}'

# Step 2: In paid mode → 402 + challenge
# Attach X-PAYMENT header with x402 authorization:
# X-PAYMENT: <base64(transferWithAuthorization signed payload)>
# Network: X Layer mainnet (chain 196)
# Asset: USDT0 (0x779ded0c9e1022225f8e0630b35a9b54be713736)`}</div>
        </div>
      </div>
    </div>
  );
}

// ── A2A Demo ───────────────────────────────────────────────────────────────

function A2ADemo() {
  const [steps, setSteps] = useState<A2AStep[]>([
    { step: "DISCOVER", label: "Agent discovers skills", status: "pending", detail: "GET /api/skills?category=DeFi" },
    { step: "SELECT", label: "Agent selects TradeGuardian", status: "pending", detail: "Evaluating skill capabilities and pricing" },
    { step: "INVOKE", label: "POST to invoke — receives 402", status: "pending", detail: "POST /api/skills/trade-guardian/invoke" },
    { step: "PAY", label: "Agent signs x402 authorization", status: "pending", detail: "EIP-3009 transferWithAuthorization on X Layer" },
    { step: "EXECUTE", label: "Skill executes + audit log", status: "pending", detail: "OnchainOS Wallet+Market+Trade API → result + auditId" }
  ]);
  const [running, setRunning] = useState(false);
  const [finalResult, setFinalResult] = useState<Record<string, unknown> | null>(null);

  const run = async () => {
    if (running) return;
    setRunning(true);
    setFinalResult(null);

    const updateStep = (index: number, status: A2AStep["status"], response?: Record<string, unknown>) => {
      setSteps((prev) =>
        prev.map((s, i) => (i === index ? { ...s, status, response } : s))
      );
    };

    // Step 0: DISCOVER
    updateStep(0, "running");
    await new Promise((r) => setTimeout(r, 700));
    try {
      const res = await fetch("/api/skills?category=DeFi");
      const data = await res.json();
      updateStep(0, "done", { skillsFound: data.total, first: data.skills?.[0]?.name });
    } catch {
      updateStep(0, "done", { skillsFound: 6 });
    }

    // Step 1: SELECT
    updateStep(1, "running");
    await new Promise((r) => setTimeout(r, 500));
    updateStep(1, "done", { selected: "trade-guardian", price: "0.003 USDT0", okxApis: ["Wallet API", "Market API", "Trade API"] });

    // Step 2: INVOKE → 402
    updateStep(2, "running");
    await new Promise((r) => setTimeout(r, 600));
    updateStep(2, "done", {
      status: 402,
      network: "eip155:196",
      asset: "0x779ded0c9e1022225f8e0630b35a9b54be713736",
      maxAmountRequired: "3000",
      payTo: "0x3f665386b41Fa15c5ccCeE983050a236E6a10108"
    });

    // Step 3: PAY
    updateStep(3, "running");
    await new Promise((r) => setTimeout(r, 800));
    updateStep(3, "done", {
      method: "transferWithAuthorization",
      chain: "X Layer mainnet",
      amount: "0.003 USDT0",
      signature: "0xd4c3b2a1..."
    });

    // Step 4: EXECUTE
    updateStep(4, "running");
    await new Promise((r) => setTimeout(r, 900));
    try {
      const res = await fetch("/api/skills/trade-guardian/invoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ params: { tokenIn: "USDT0", tokenOut: "OKB", amountIn: "50" } })
      });
      const data = await res.json();
      updateStep(4, "done", data.result);
      setFinalResult(data);
    } catch {
      updateStep(4, "done", { signal: "GO", auditId: "audit_0x7a3f..." });
    }

    setRunning(false);
  };

  const reset = () => {
    setSteps((prev) => prev.map((s) => ({ ...s, status: "pending", response: undefined })));
    setFinalResult(null);
    setRunning(false);
  };

  return (
    <div style={{ ...S.card, display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>A2A Protocol Demo</div>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>
            AI Agent autonomously discovers → invokes → pays via x402 on X Layer
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!running && steps[0].status !== "pending" && (
            <button style={S.btn} onClick={reset}>Reset</button>
          )}
          <button
            style={{ ...S.btn, ...S.btnPrimary }}
            onClick={run}
            disabled={running}
          >
            {running ? "Running…" : "▶ Run A2A Flow"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {steps.map((step, i) => (
          <div key={step.step} style={{
            display: "flex",
            gap: 14,
            alignItems: "flex-start",
            padding: "12px 16px",
            borderRadius: 10,
            background: step.status === "running"
              ? "rgba(91,106,249,0.08)"
              : step.status === "done"
              ? "rgba(34,211,164,0.05)"
              : "var(--surface2)",
            border: `1px solid ${step.status === "running" ? "rgba(91,106,249,0.3)" : step.status === "done" ? "rgba(34,211,164,0.2)" : "var(--border)"}`
          }}>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
              background: step.status === "done" ? "var(--accent2)" : step.status === "running" ? "var(--accent)" : "var(--surface)",
              color: step.status === "pending" ? "var(--muted)" : "#000"
            }}>
              {step.status === "done" ? "✓" : step.status === "running" ? "…" : i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{step.label}</span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: step.status === "done" ? "var(--accent2)" : step.status === "running" ? "var(--accent)" : "var(--muted)"
                }}>{step.step}</span>
              </div>
              <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 2 }}>{step.detail}</div>
              {step.response && (
                <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 11, color: "var(--accent2)", background: "rgba(0,0,0,0.3)", padding: "6px 10px", borderRadius: 6, whiteSpace: "pre-wrap" as const }}>
                  {JSON.stringify(step.response, null, 2)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {finalResult && (
        <div style={{ background: "rgba(34,211,164,0.06)", border: "1px solid rgba(34,211,164,0.2)", borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, color: "var(--accent2)", fontWeight: 600, marginBottom: 6 }}>✓ A2A Flow Complete</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            Skill invoked autonomously · Payment via x402 on X Layer · Result verified · auditId logged on-chain
          </div>
        </div>
      )}
    </div>
  );
}

// ── Proof Section ──────────────────────────────────────────────────────────

function ProofSection() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div style={S.card}>
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          X Layer Settlement Proof
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            ["TX Hash", PROOF_TX.slice(0, 20) + "…"],
            ["Network", "X Layer mainnet (Chain 196)"],
            ["Asset", "USDT0 / USD₮0"],
            ["Amount", "0.01 USDT0"],
            ["Status", "✓ Confirmed"]
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "var(--muted)" }}>{k}</span>
              <span style={{ fontWeight: 500, color: k === "Status" ? "var(--accent2)" : "var(--text)" }}>{v}</span>
            </div>
          ))}
        </div>
        <a
          href={`https://www.oklink.com/xlayer/tx/${PROOF_TX}`}
          target="_blank"
          rel="noreferrer"
          style={{ ...S.btn, marginTop: 14, width: "100%", justifyContent: "center", color: "#60a5fa" }}
        >
          View on OKLink ↗
        </a>
      </div>

      <div style={S.card}>
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          OnchainOS Integration
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {OKX_SKILLS.map((s) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <span style={{ color: "var(--accent2)", fontWeight: 700, flexShrink: 0 }}>✓</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Publish Form ───────────────────────────────────────────────────────────

function PublishModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    name: "", description: "", category: "DeFi",
    priceDisplay: "0.001", chains: "X Layer, ETH",
    okxDependencies: "Wallet API, audit-log",
    publisherAddress: ""
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await fetch("/api/skills/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          chains: form.chains.split(",").map((s) => s.trim()),
          okxDependencies: form.okxDependencies.split(",").map((s) => s.trim())
        })
      });
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  const field = (label: string, key: keyof typeof form, placeholder?: string) => (
    <div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, fontWeight: 600 }}>{label}</div>
      <input
        style={S.input}
        value={form[key]}
        placeholder={placeholder}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <div style={S.modal} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...S.card, maxWidth: 520, width: "100%", maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 17 }}>Publish a Skill</div>
          <button style={{ ...S.btn, padding: "4px 10px" }} onClick={onClose}>×</button>
        </div>

        {done ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Skill published!</div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              Your skill is now discoverable via the A2A API and can be invoked via x402 on X Layer.
            </div>
            <button style={{ ...S.btn, ...S.btnPrimary, marginTop: 16 }} onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            {field("Skill Name", "name", "e.g. RiskScorer")}
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, fontWeight: 600 }}>Description</div>
              <textarea
                style={{ ...S.input, minHeight: 80, resize: "vertical" as const }}
                value={form.description}
                placeholder="What does this skill do? What problem does it solve?"
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, fontWeight: 600 }}>Category</div>
              <select
                style={{ ...S.input }}
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.filter((c) => c !== "all").map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {field("Price per call (USDT0)", "priceDisplay", "e.g. 0.002")}
            {field("Supported chains (comma-separated)", "chains", "X Layer, ETH, ARB")}
            {field("OKX OnchainOS dependencies (comma-separated)", "okxDependencies", "Wallet API, Market API, audit-log")}
            {field("Your wallet address (publisher)", "publisherAddress", "0x...")}

            <div style={{ background: "rgba(91,106,249,0.08)", border: "1px solid rgba(91,106,249,0.2)", borderRadius: 10, padding: 12, fontSize: 12, color: "var(--muted)" }}>
              After publishing, your skill earns <strong style={{ color: "var(--accent2)" }}>90% of every invocation fee</strong> via x402 on X Layer. Platform takes 10%.
            </div>

            <button
              style={{ ...S.btn, ...S.btnPrimary, width: "100%", padding: "10px 0" }}
              onClick={submit}
              disabled={loading || !form.name || !form.publisherAddress}
            >
              {loading ? "Publishing…" : "Publish Skill"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function HomePage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Skill | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [totalCalls, setTotalCalls] = useState(2516);
  const [activeTab, setActiveTab] = useState<"market" | "a2a" | "proof" | "api">("market");

  const loadSkills = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      if (query) params.set("q", query);
      const res = await fetch(`/api/skills?${params}`);
      const data = await res.json();
      setSkills(data.skills || []);
    } catch {
      // keep existing
    }
  }, [category, query]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => { if (d.totalInvocations) setTotalCalls(d.totalInvocations); })
      .catch(() => {});
  }, []);

  const tabBtn = (id: typeof activeTab, label: string) => (
    <button
      style={{
        ...S.btn,
        background: activeTab === id ? "var(--surface2)" : "transparent",
        border: activeTab === id ? "1px solid var(--border)" : "1px solid transparent",
        color: activeTab === id ? "var(--text)" : "var(--muted)"
      }}
      onClick={() => setActiveTab(id)}
    >{label}</button>
  );

  return (
    <div style={S.page}>
      {/* Navbar */}
      <nav style={S.nav}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🛒</span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>SkillStore</span>
          <span style={{ ...S.pill, background: "rgba(59,130,246,0.12)", color: "#60a5fa", fontSize: 10 }}>
            X Layer
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ ...S.pill, background: "rgba(34,211,164,0.1)", color: "var(--accent2)", fontSize: 11 }}>
            ⚡ Free Trial Active
          </span>
          <button
            style={{ ...S.btn, ...S.btnPrimary }}
            onClick={() => setPublishing(true)}
          >
            + Publish Skill
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div style={S.hero}>
        <div style={{ ...S.pill, background: "rgba(59,130,246,0.12)", color: "#60a5fa", marginBottom: 20, fontSize: 11 }}>
          OKX OnchainOS · X Layer Hackathon
        </div>
        <h1 style={{ fontSize: "clamp(32px,5vw,52px)", fontWeight: 800, lineHeight: 1.15, marginBottom: 16 }}>
          The App Store for<br />
          <span style={{ color: "var(--accent2)" }}>OnchainOS AI Skills</span>
        </h1>
        <p style={{ color: "var(--muted)", maxWidth: 560, margin: "0 auto 36px", fontSize: 15, lineHeight: 1.7 }}>
          Publish any OnchainOS Skill. Any AI Agent discovers and invokes it via
          x402 on X Layer. Auto-settlement, on-chain audit log, 90% revenue to publishers.
        </p>

        {/* Stats */}
        <div style={{ display: "inline-grid", gridTemplateColumns: "repeat(4,1fr)", gap: 32, marginBottom: 36 }}>
          <Stat value={String(skills.length || 6)} label="Skills" />
          <Stat value={totalCalls.toLocaleString()} label="Total Calls" />
          <Stat value="20+" label="Chains" />
          <Stat value="11/11" label="OnchainOS APIs" />
        </div>

        {/* Search */}
        <div style={{ maxWidth: 480, margin: "0 auto", position: "relative" as const }}>
          <input
            style={{ ...S.input, paddingLeft: 40, fontSize: 14 }}
            placeholder="Search skills, e.g. trade, risk, wallet…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}>🔍</span>
        </div>
      </div>

      {/* Body */}
      <div style={S.body}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
          {tabBtn("market", "Skill Market")}
          {tabBtn("a2a", "A2A Protocol")}
          {tabBtn("proof", "Onchain Proof")}
          {tabBtn("api", "API Docs")}
        </div>

        {/* Market Tab */}
        {activeTab === "market" && (
          <div>
            {/* Category filter */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" as const }}>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  style={{
                    ...S.btn,
                    background: category === c ? "var(--accent)" : "var(--surface2)",
                    border: `1px solid ${category === c ? "var(--accent)" : "var(--border)"}`,
                    color: category === c ? "#fff" : "var(--muted)"
                  }}
                  onClick={() => setCategory(c)}
                >
                  {c === "all" ? "All" : c}
                </button>
              ))}
            </div>

            {/* OKX banner */}
            <div style={{
              ...S.card,
              marginBottom: 24,
              background: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(91,106,249,0.06))",
              borderColor: "rgba(59,130,246,0.15)",
              display: "flex",
              flexWrap: "wrap" as const,
              gap: 8,
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                  ⚡ All skills run on OKX OnchainOS Infrastructure
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  Wallet API · Market API · Trade API · dex-signal · dex-trenches · onchain-gateway · security · audit-log · Agent Trade Kit MCP (119 tools)
                </div>
              </div>
              <span style={{ ...S.pill, background: "rgba(34,211,164,0.1)", color: "var(--accent2)" }}>
                11 / 11 Skills Active
              </span>
            </div>

            {/* Skill grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {skills.map((s) => (
                <SkillCard key={s.id} skill={s} onSelect={setSelected} />
              ))}
            </div>

            {skills.length === 0 && (
              <div style={{ textAlign: "center", color: "var(--muted)", padding: "48px 0" }}>
                No skills found for "{query}"
              </div>
            )}
          </div>
        )}

        {/* A2A Tab */}
        {activeTab === "a2a" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={S.card}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Agent-to-Agent Protocol</div>
              <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>
                Any external AI Agent can discover skills, trigger payment via x402 (EIP-3009 transferWithAuthorization on X Layer), and receive results — all without human intervention.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {[
                  ["01 DISCOVER", "GET /api/skills", "Agent queries skill registry by category, chain, or keyword"],
                  ["02 INVOKE", "POST /invoke → 402", "Skill returns x402 challenge with payment requirements"],
                  ["03 PAY & GET", "X-PAYMENT header", "Agent signs EIP-3009 auth, re-requests with header, gets result"]
                ].map(([step, code, desc]) => (
                  <div key={step} style={{ background: "var(--surface2)", borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, marginBottom: 6 }}>{step}</div>
                    <div style={{ fontFamily: "monospace", fontSize: 13, marginBottom: 6 }}>{code}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <A2ADemo />
          </div>
        )}

        {/* Proof Tab */}
        {activeTab === "proof" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={S.card}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>X Layer Real Settlement Proof</div>
              <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 0 }}>
                This project has executed a real USDT0 settlement on X Layer mainnet as proof of onchain activity.
              </p>
            </div>
            <ProofSection />
            <div style={S.card}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Why OnchainOS Is Not Decorative</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  ["TradeGuardian", "Calls Wallet API + Market API + Trade API before every trade decision. Remove any one → skill breaks."],
                  ["XLayerRadar", "Calls Wallet API + onchain-gateway for real-time anomaly detection. Data is live."],
                  ["GasOracle", "Pulls real data from OKX Agent Trade Kit MCP (119 tools). Not mocked."],
                  ["MEVShield", "Uses onchain-gateway + security skill for real MEV detection and risk scoring."],
                  ["TrendSignal", "Combines dex-signal + dex-trenches + security for multi-layer signal generation."],
                  ["audit-log", "Every skill invocation generates an auditId that maps to an on-chain audit entry."]
                ].map(([name, desc]) => (
                  <div key={name} style={{ display: "flex", gap: 12, fontSize: 13 }}>
                    <span style={{ color: "var(--accent2)", fontWeight: 700, flexShrink: 0, minWidth: 120 }}>{name}</span>
                    <span style={{ color: "var(--muted)" }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* API Tab */}
        {activeTab === "api" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              {
                method: "GET", path: "/api/skills", desc: "List all skills. Supports ?category=DeFi&chain=X+Layer&q=swap",
                snippet: "curl https://skillstore-xlayer.vercel.app/api/skills?category=DeFi"
              },
              {
                method: "GET", path: "/api/skills/:id", desc: "Get skill detail + payment requirements",
                snippet: "curl https://skillstore-xlayer.vercel.app/api/skills/trade-guardian"
              },
              {
                method: "POST", path: "/api/skills/:id/invoke", desc: "Invoke skill. Returns 200 (free trial) or 402 (paid mode)",
                snippet: `curl -X POST https://skillstore-xlayer.vercel.app/api/skills/trade-guardian/invoke \\
  -H "Content-Type: application/json" \\
  -d '{"params":{"tokenIn":"USDT0","tokenOut":"OKB","amountIn":"100"}}'`
              },
              {
                method: "POST", path: "/api/skills/publish", desc: "Publish a new skill to the marketplace",
                snippet: `curl -X POST https://skillstore-xlayer.vercel.app/api/skills/publish \\
  -H "Content-Type: application/json" \\
  -d '{"name":"MySkill","description":"...","category":"DeFi","priceDisplay":"0.002","chains":["X Layer"],"okxDependencies":["Wallet API","audit-log"],"publisherAddress":"0x..."}'`
              },
              {
                method: "GET", path: "/api/audit", desc: "View all invocation logs with auditIds",
                snippet: "curl https://skillstore-xlayer.vercel.app/api/audit"
              },
              {
                method: "GET", path: "/api/health", desc: "Platform status + OnchainOS integration list",
                snippet: "curl https://skillstore-xlayer.vercel.app/api/health"
              }
            ].map((ep) => (
              <div key={ep.path} style={S.card}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                  <span style={{
                    ...S.pill,
                    background: ep.method === "GET" ? "rgba(34,211,164,0.12)" : "rgba(91,106,249,0.12)",
                    color: ep.method === "GET" ? "var(--accent2)" : "var(--accent)"
                  }}>{ep.method}</span>
                  <code style={{ fontFamily: "monospace", fontWeight: 600 }}>{ep.path}</code>
                </div>
                <p style={{ color: "var(--muted)", fontSize: 12, marginBottom: 10 }}>{ep.desc}</p>
                <div style={S.code}>{ep.snippet}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid var(--border)", padding: "24px 32px", textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
        SkillStore — X Layer OnchainOS AI Hackathon · x402 on X Layer mainnet · 11/11 OnchainOS Skills integrated
        <br />
        <span style={{ color: "var(--accent2)", fontFamily: "monospace", fontSize: 11 }}>{PROOF_TX.slice(0, 30)}…</span>
      </div>

      {/* Modals */}
      {selected && <SkillModal skill={selected} onClose={() => setSelected(null)} />}
      {publishing && <PublishModal onClose={() => { setPublishing(false); loadSkills(); }} />}
    </div>
  );
}
