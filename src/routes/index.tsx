import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Zap, Link2, KeyRound, Bitcoin, Loader2, CheckCircle2, XCircle } from "lucide-react";
import {
  LightningConnect,
  useWalletConnect,
} from "../../lightningconnect/src";
import type { Invoice } from "../../lightningconnect/src/types";

export const Route = createFileRoute("/")({
  component: Demo,
  head: () => ({
    meta: [
      { title: "LightningConnect — Zero-friction Bitcoin wallet connect" },
      {
        name: "description",
        content:
          "Drop-in React widget and hook for Bitcoin wallet connection. Auto payment detection, three connectors, one component.",
      },
    ],
  }),
});

const COLORS = {
  bg: "#0A0A0A",
  panel: "#111111",
  fg: "#F5F5F5",
  muted: "#A1A1AA",
  border: "#262626",
  primary: "#F7931A",
};

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
        color: COLORS.fg,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <LightningConnect
        theme={{
          primary: COLORS.primary,
          background: COLORS.panel,
          foreground: COLORS.fg,
          border: COLORS.border,
          muted: COLORS.muted,
        }}
        onConnect={(w) => console.log("Connected:", w)}
      />

      <main
        style={{
          maxWidth: 880,
          margin: "0 auto",
          padding: "80px 24px 120px",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 999,
            fontSize: 12,
            color: COLORS.muted,
            marginBottom: 28,
          }}
        >
          <Zap size={12} aria-hidden style={{ color: COLORS.primary }} /> v1.0.0 — npm
          install lightningconnect
        </div>

        <h1
          style={{
            fontSize: 56,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            margin: 0,
            fontWeight: 700,
          }}
        >
          Zero-friction Bitcoin
          <br />
          wallet connection.
        </h1>
        <p
          style={{
            fontSize: 18,
            color: COLORS.muted,
            marginTop: 20,
            maxWidth: 620,
          }}
        >
          Drop-in React widget + hook. Connect via Blink Lightning Address,
          NWC, or Blink API Key. Built-in payment detection — no polling code
          to write. One component, every user covered.
        </p>

        <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
          {!isConnected ? (
            <button
              onClick={connect}
              style={{
                background: COLORS.primary,
                color: "#0A0A0A",
                border: "none",
                borderRadius: 12,
                padding: "14px 22px",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try the widget →
            </button>
          ) : (
            <button
              onClick={disconnect}
              style={{
                background: "transparent",
                color: COLORS.fg,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                padding: "14px 22px",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Disconnect {walletInfo?.address}
            </button>
          )}
          <Link
            to="/readme"
            style={{
              background: "transparent",
              color: COLORS.fg,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              padding: "14px 22px",
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            View README
          </Link>
        </div>

        <section
          style={{
            marginTop: 64,
            padding: 28,
            background: COLORS.panel,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <div>
              <div style={{ fontSize: 13, color: COLORS.muted }}>
                Live playground
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>
                {isConnected
                  ? `Connected via ${connectionType}`
                  : "Not connected"}
              </div>
            </div>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: isConnected ? "#22c55e" : COLORS.muted,
              }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="amount"
              style={inputStyle}
            />
            <input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="memo"
              style={inputStyle}
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "BTC" | "USD")}
              style={inputStyle}
            >
              <option value="BTC">sats</option>
              <option value="USD">USD</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleMake}
              disabled={!isConnected || busy}
              style={{
                ...primaryBtnStyle,
                opacity: !isConnected || busy ? 0.5 : 1,
              }}
            >
              makeInvoice()
            </button>
            <button
              onClick={handleCancel}
              disabled={watchStatus !== "watching"}
              style={{
                ...secondaryBtnStyle,
                opacity: watchStatus !== "watching" ? 0.5 : 1,
              }}
            >
              cancelWatch()
            </button>
          </div>

          {err && (
            <div
              style={{
                marginTop: 16,
                color: "#ef4444",
                fontSize: 13,
                fontFamily: "ui-monospace, monospace",
              }}
            >
              {err}
            </div>
          )}

          {invoice && (
            <div
              style={{
                marginTop: 20,
                padding: 16,
                background: "#000",
                border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
                fontSize: 12,
                fontFamily: "ui-monospace, monospace",
                wordBreak: "break-all",
                color: COLORS.muted,
              }}
            >
              <div style={{ color: COLORS.primary, marginBottom: 6 }}>
                bolt11
              </div>
              {invoice.bolt11}
              <div
                style={{
                  marginTop: 10,
                  color: COLORS.primary,
                  marginBottom: 4,
                }}
              >
                payment_hash
              </div>
              {invoice.paymentHash}

              <WatchIndicator
                status={watchStatus}
                pollCount={pollCount}
                error={watchError}
              />
            </div>
          )}
        </section>

        <section style={{ marginTop: 56, display: "grid", gap: 16 }}>
          {[
            {
              Icon: Zap,
              title: "Blink Lightning Address",
              body: "Just your Blink username. No API key, no dashboard, no setup. Instant.",
            },
            {
              Icon: Link2,
              title: "Nostr Wallet Connect",
              body: "Paste a connection string from Alby, Zeus, Coinos, or any NWC wallet. Decentralized and flexible.",
            },
            {
              Icon: KeyRound,
              title: "Blink API Key",
              body: "Full control for power users. Unlocks transaction history, balance, and advanced features.",
            },
          ].map((f) => (
            <div
              key={f.title}
              style={{
                padding: 20,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 14,
                background: COLORS.panel,
              }}
            >
              <div
                style={{ marginBottom: 8, color: COLORS.primary }}
                aria-hidden="true"
              >
                <f.Icon size={22} />
              </div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{f.title}</div>
              <div
                style={{ color: COLORS.muted, fontSize: 14, marginTop: 6 }}
              >
                {f.body}
              </div>
            </div>
          ))}
        </section>

        <footer
          style={{
            marginTop: 80,
            paddingTop: 24,
            borderTop: `1px solid ${COLORS.border}`,
            color: COLORS.muted,
            fontSize: 13,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>lightningconnect · v1.0.0 · MIT</span>
          <span>&lt;30kb gzipped · React 18+</span>
        </footer>
      </main>
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
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 12,
  };

  if (status === "watching") {
    return (
      <div
        style={{
          ...row,
          background: "rgba(161,161,170,0.12)",
          color: COLORS.fg,
        }}
      >
        <Loader2
          size={14}
          aria-hidden
          style={{ animation: "spin 1s linear infinite" }}
        />
        <span style={{ color: COLORS.muted }}>
          Watching for payment — checked {pollCount} time
          {pollCount === 1 ? "" : "s"}…
        </span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }
  if (status === "paid") {
    return (
      <div
        style={{
          ...row,
          background: "rgba(34,197,94,0.15)",
          color: "#22c55e",
          fontWeight: 600,
        }}
      >
        <CheckCircle2 size={14} aria-hidden /> Payment received!
      </div>
    );
  }
  if (status === "expired") {
    return (
      <div
        style={{
          ...row,
          background: "rgba(239,68,68,0.15)",
          color: "#ef4444",
          fontWeight: 600,
        }}
      >
        <XCircle size={14} aria-hidden /> Invoice expired
      </div>
    );
  }
  return (
    <div
      style={{
        ...row,
        background: "rgba(239,68,68,0.15)",
        color: "#ef4444",
      }}
    >
      <XCircle size={14} aria-hidden /> {error ?? "Watcher error"}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#000",
  color: COLORS.fg,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  padding: "12px 14px",
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
};

const primaryBtnStyle: React.CSSProperties = {
  background: COLORS.primary,
  color: "#0A0A0A",
  border: "none",
  borderRadius: 10,
  padding: "12px 18px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "ui-monospace, monospace",
};

const secondaryBtnStyle: React.CSSProperties = {
  background: "transparent",
  color: COLORS.fg,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  padding: "12px 18px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "ui-monospace, monospace",
};
