import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  Zap,
  Link2,
  KeyRound,
  Bitcoin,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  LightningConnect,
  useWalletConnect,
} from "../../lightningconnect/src";
import type { Invoice } from "../../lightningconnect/src/types";

export const Route = createFileRoute("/")({
  component: Demo,
  head: () => ({
    meta: [
      { title: "LightningConnect — Bitcoin wallet connection for React" },
      {
        name: "description",
        content:
          "Drop-in React widget and hook for Bitcoin wallet connection. Built-in payment detection, four connectors, one component.",
      },
    ],
  }),
});

// Paper & Ink palette
const COLORS = {
  bg: "#f5f3ee",
  surface: "#e8e4dd",
  border: "#dcd9d1",
  borderSoft: "rgba(13,13,13,0.08)",
  ink: "#0d0d0d",
  text: "#2d2d2d",
  muted: "rgba(45,45,45,0.6)",
  mutedFaint: "rgba(45,45,45,0.4)",
} as const;

const FONT_SANS =
  '"Manrope", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const FONT_DISPLAY = '"Sora", ' + FONT_SANS;
const FONT_MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';

type WatchStatus = "idle" | "watching" | "paid" | "expired" | "error";

function Demo() {
  const [pollCount, setPollCount] = useState(0);
  const [watchStatus, setWatchStatus] = useState<WatchStatus>("idle");
  const [watchError, setWatchError] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTicker = () => {
    setPollCount(0);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(() => {
      setPollCount((n) => n + 1);
    }, 5000);
  };
  const stopTicker = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const {
    connect,
    disconnect,
    isConnected,
    connectionType,
    walletInfo,
    makeInvoice,
    cancelWatch,
  } = useWalletConnect({
    pollInterval: 5000,
    onPayment: () => {
      stopTicker();
      setWatchStatus("paid");
    },
    onExpiry: () => {
      stopTicker();
      setWatchStatus("expired");
    },
    onError: (e) => {
      setWatchError(e.message);
      setWatchStatus("error");
    },
  });

  const [amount, setAmount] = useState("1000");
  const [memo, setMemo] = useState("Coffee");
  const [currency, setCurrency] = useState<"BTC" | "USD">("BTC");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleMake = async () => {
    setErr(null);
    setWatchError(null);
    setInvoice(null);
    setWatchStatus("idle");
    setBusy(true);
    try {
      const inv = await makeInvoice(Number(amount), currency, memo);
      setInvoice(inv);
      setWatchStatus("watching");
      startTicker();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    if (invoice) cancelWatch(invoice);
    stopTicker();
    setWatchStatus("idle");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        color: COLORS.text,
        fontFamily: FONT_SANS,
      }}
    >
      <LightningConnect
        theme={{
          primary: COLORS.ink,
          background: COLORS.bg,
          foreground: COLORS.ink,
          border: COLORS.border,
          muted: COLORS.muted as string,
          radius: "6px",
        }}
        onConnect={(w) => console.log("Connected:", w)}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "48px 24px 96px",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            width: "100%",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 80,
            alignItems: "start",
          }}
          className="lc-grid"
        >
          {/* LEFT — pitch */}
          <section style={{ display: "flex", flexDirection: "column", gap: 40 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: 4,
                    border: `1px solid ${COLORS.borderSoft}`,
                    fontFamily: FONT_MONO,
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                    color: COLORS.text,
                  }}
                >
                  v1.0.0
                </span>
                <code
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 11,
                    background: COLORS.surface,
                    color: COLORS.muted as string,
                    padding: "3px 8px",
                    borderRadius: 4,
                    fontStyle: "italic",
                  }}
                >
                  npm install lightningconnect
                </code>
              </div>

              <h1
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: "clamp(40px, 5vw, 60px)",
                  lineHeight: 1.08,
                  letterSpacing: "-0.02em",
                  fontWeight: 600,
                  color: COLORS.ink,
                  margin: 0,
                  maxWidth: 520,
                }}
              >
                Zero-friction Bitcoin wallet connection.
              </h1>

              <p
                style={{
                  fontSize: 17,
                  lineHeight: 1.6,
                  color: COLORS.text,
                  margin: 0,
                  maxWidth: 480,
                }}
              >
                Drop-in React widget + hook. Blink-native with two dedicated
                connectors, plus universal Lightning Address and Nostr Wallet
                Connect for every other wallet. Built-in payment detection — no
                polling code to write. One component, every user covered.
              </p>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {!isConnected ? (
                <button onClick={connect} style={primaryBtn}>
                  Try the widget →
                </button>
              ) : (
                <button onClick={disconnect} style={secondaryBtn}>
                  Disconnect {walletInfo?.address}
                </button>
              )}
              <Link to="/readme" style={{ ...secondaryBtn, textDecoration: "none" }}>
                View README
              </Link>
            </div>

            <dl
              style={{
                marginTop: 8,
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0,1fr))",
                gap: 24,
                paddingTop: 32,
                borderTop: `1px solid ${COLORS.border}`,
                maxWidth: 480,
              }}
            >
              {[
                ["4", "connectors"],
                ["<30kb", "gzipped"],
                ["React 18+", "MIT licensed"],
              ].map(([k, v]) => (
                <div key={v}>
                  <dt
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontSize: 18,
                      fontWeight: 600,
                      color: COLORS.ink,
                    }}
                  >
                    {k}
                  </dt>
                  <dd
                    style={{
                      margin: 0,
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: COLORS.mutedFaint as string,
                      fontFamily: FONT_MONO,
                      marginTop: 4,
                    }}
                  >
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* RIGHT — playground + connectors */}
          <section style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {/* PLAYGROUND */}
            <div
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.borderSoft}`,
                borderRadius: 6,
                padding: 28,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 24,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.16em",
                      color: COLORS.mutedFaint as string,
                      marginBottom: 6,
                    }}
                  >
                    Live playground
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontSize: 17,
                      fontWeight: 500,
                      color: COLORS.ink,
                    }}
                  >
                    {isConnected
                      ? `Connected · ${connectionType}`
                      : "Not connected"}
                  </div>
                </div>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: isConnected ? "#16a34a" : "rgba(45,45,45,0.25)",
                    marginTop: 8,
                  }}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0,4fr) minmax(0,5fr) minmax(0,3fr)",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="amount"
                  style={fieldStyle(true)}
                />
                <input
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="memo"
                  style={fieldStyle()}
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as "BTC" | "USD")}
                  style={fieldStyle(true)}
                >
                  <option value="BTC">sats</option>
                  <option value="USD">USD</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleMake}
                  disabled={!isConnected || busy}
                  style={{
                    ...monoPrimaryBtn,
                    opacity: !isConnected || busy ? 0.45 : 1,
                    cursor: !isConnected || busy ? "not-allowed" : "pointer",
                  }}
                >
                  makeInvoice()
                </button>
                <button
                  onClick={handleCancel}
                  disabled={watchStatus !== "watching"}
                  style={{
                    ...monoSecondaryBtn,
                    opacity: watchStatus !== "watching" ? 0.45 : 1,
                    cursor: watchStatus !== "watching" ? "not-allowed" : "pointer",
                  }}
                >
                  cancelWatch()
                </button>
              </div>

              {err && (
                <div
                  style={{
                    marginTop: 14,
                    color: "#b91c1c",
                    fontSize: 12,
                    fontFamily: FONT_MONO,
                  }}
                >
                  {err}
                </div>
              )}

              {invoice && (
                <div
                  style={{
                    marginTop: 18,
                    padding: 14,
                    background: COLORS.bg,
                    border: `1px solid ${COLORS.borderSoft}`,
                    borderRadius: 4,
                    fontFamily: FONT_MONO,
                    fontSize: 11,
                    color: COLORS.muted as string,
                    wordBreak: "break-all",
                  }}
                >
                  <div style={metaLabel}>bolt11</div>
                  {invoice.bolt11}
                  <div style={{ ...metaLabel, marginTop: 10 }}>payment_hash</div>
                  {invoice.paymentHash}
                  <WatchIndicator
                    status={watchStatus}
                    pollCount={pollCount}
                    error={watchError}
                  />
                </div>
              )}
            </div>

            {/* CONNECTORS */}
            <ConnectorGroup label="Blink">
              <ConnectorRow
                Icon={Zap}
                title="Blink Lightning Address"
                body="Just your Blink username. No API key, no dashboard, no setup. Instant."
                emphasized
              />
              <ConnectorRow
                Icon={KeyRound}
                title="Blink API Key"
                body="Full control for power users. Transaction history, balance, and advanced features."
                emphasized
              />
            </ConnectorGroup>

            <ConnectorGroup label="Other Wallets">
              <ConnectorRow
                Icon={Bitcoin}
                title="Lightning Address"
                body="Any user@domain.tld — Wallet of Satoshi, Alby, Coinos, Strike and more. Universal LNURL-pay."
              />
              <ConnectorRow
                Icon={Link2}
                title="Nostr Wallet Connect"
                body="Beta — pair Alby Hub, Zeus, Phoenix or any NIP-47 wallet by pasting a connection string."
              />
            </ConnectorGroup>

            <div
              style={{
                marginTop: 8,
                paddingTop: 18,
                borderTop: `1px solid ${COLORS.border}`,
                display: "flex",
                justifyContent: "space-between",
                fontFamily: FONT_MONO,
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: COLORS.mutedFaint as string,
              }}
            >
              <span>lightningconnect · v1.0.0 · MIT</span>
              <span>React 18+</span>
            </div>
          </section>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .lc-grid { grid-template-columns: minmax(0, 1fr) !important; gap: 48px !important; }
        }
        @keyframes lc-spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  background: COLORS.ink,
  color: COLORS.bg,
  border: `1px solid ${COLORS.ink}`,
  borderRadius: 4,
  padding: "12px 22px",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: FONT_SANS,
};

const secondaryBtn: React.CSSProperties = {
  background: "transparent",
  color: COLORS.ink,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 4,
  padding: "12px 22px",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: FONT_SANS,
  display: "inline-flex",
  alignItems: "center",
};

const monoPrimaryBtn: React.CSSProperties = {
  flex: 1,
  background: COLORS.ink,
  color: COLORS.bg,
  border: `1px solid ${COLORS.ink}`,
  borderRadius: 4,
  padding: "10px 14px",
  fontSize: 12,
  fontFamily: FONT_MONO,
};

const monoSecondaryBtn: React.CSSProperties = {
  flex: 1,
  background: "transparent",
  color: COLORS.text,
  border: `1px solid ${COLORS.borderSoft}`,
  borderRadius: 4,
  padding: "10px 14px",
  fontSize: 12,
  fontFamily: FONT_MONO,
};

function fieldStyle(mono = false): React.CSSProperties {
  return {
    width: "100%",
    background: COLORS.bg,
    color: COLORS.ink,
    border: `1px solid ${COLORS.borderSoft}`,
    borderRadius: 4,
    padding: "10px 12px",
    fontSize: 13,
    fontFamily: mono ? FONT_MONO : FONT_SANS,
    outline: "none",
    boxSizing: "border-box",
  };
}

const metaLabel: React.CSSProperties = {
  color: COLORS.ink,
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  marginBottom: 4,
};

function ConnectorGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: COLORS.mutedFaint as string,
          }}
        >
          {label}
        </span>
        <span style={{ flex: 1, height: 1, background: COLORS.borderSoft }} />
      </div>
      <div style={{ display: "grid", gap: 8 }}>{children}</div>
    </div>
  );
}

function ConnectorRow({
  Icon,
  title,
  body,
  emphasized = false,
}: {
  Icon: React.ComponentType<{ size?: number }>;
  title: string;
  body: string;
  emphasized?: boolean;
}) {
  return (
    <div
      style={{
        padding: 16,
        border: `1px solid ${COLORS.borderSoft}`,
        borderRadius: 4,
        background: "transparent",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        transition: "border-color 120ms",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.borderColor = "rgba(13,13,13,0.4)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = COLORS.borderSoft)
      }
    >
      <div
        style={{
          marginTop: 2,
          color: emphasized ? COLORS.ink : (COLORS.mutedFaint as string),
        }}
        aria-hidden
      >
        <Icon size={14} />
      </div>
      <div>
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 13,
            fontWeight: 600,
            color: COLORS.ink,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: COLORS.muted as string,
            marginTop: 4,
            lineHeight: 1.5,
          }}
        >
          {body}
        </div>
      </div>
    </div>
  );
}

function WatchIndicator({
  status,
  pollCount,
  error,
}: {
  status: WatchStatus;
  pollCount: number;
  error: string | null;
}) {
  if (status === "idle") return null;
  const row: React.CSSProperties = {
    marginTop: 14,
    padding: "10px 12px",
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 12,
    fontFamily: FONT_SANS,
  };
  if (status === "watching") {
    return (
      <div style={{ ...row, background: "rgba(13,13,13,0.05)", color: COLORS.ink }}>
        <Loader2 size={14} aria-hidden style={{ animation: "lc-spin 1s linear infinite" }} />
        <span style={{ color: COLORS.muted as string }}>
          Watching for payment — checked {pollCount} time{pollCount === 1 ? "" : "s"}…
        </span>
      </div>
    );
  }
  if (status === "paid") {
    return (
      <div style={{ ...row, background: "rgba(22,163,74,0.12)", color: "#15803d", fontWeight: 600 }}>
        <CheckCircle2 size={14} aria-hidden /> Payment received
      </div>
    );
  }
  if (status === "expired") {
    return (
      <div style={{ ...row, background: "rgba(180,83,9,0.12)", color: "#b45309", fontWeight: 600 }}>
        <XCircle size={14} aria-hidden /> Invoice expired
      </div>
    );
  }
  return (
    <div style={{ ...row, background: "rgba(185,28,28,0.1)", color: "#b91c1c", fontWeight: 600 }}>
      <XCircle size={14} aria-hidden /> {error ?? "Error"}
    </div>
  );
}
