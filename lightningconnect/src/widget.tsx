import { useState, useEffect, type CSSProperties } from "react";
import QRCode from "qrcode";
import type { Connection, Theme } from "./types";
import { validateBlinkAddress } from "./connectors/blink-address";
import { parseNwcUri } from "./connectors/nwc";
import {
  useWidgetStore,
  persistConnection,
  useWalletConnect,
} from "./hooks/useWalletConnect";

interface LightningConnectProps {
  theme?: Theme;
  onConnect?: (wallet: Connection) => void;
  onSkip?: () => void;
}

const defaultTheme: Required<Theme> = {
  primary: "#F7931A",
  background: "#0A0A0A",
  foreground: "#F5F5F5",
  border: "#262626",
  radius: "14px",
  muted: "#A1A1AA",
};

type View = "home" | "blink" | "nwc" | "nwc-qr" | "nwc-paste";

export function LightningConnect({
  theme,
  onConnect,
  onSkip,
}: LightningConnectProps) {
  const t = { ...defaultTheme, ...theme };
  const { modalOpen, setModalOpen } = useWidgetStore();
  const [view, setView] = useState<View>("home");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blinkInput, setBlinkInput] = useState("");
  const [nwcInput, setNwcInput] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!modalOpen) {
      setView("home");
      setError(null);
      setBlinkInput("");
      setNwcInput("");
      setQrDataUrl(null);
    }
  }, [modalOpen]);

  useEffect(() => {
    if (view !== "nwc-qr") return;
    // Generate a request-for-connection QR (NIP-47 client side request)
    // For demo purposes we render an instructional payload — the user pastes back
    const payload = "nostr+walletconnect://?demo=scan-from-your-wallet";
    QRCode.toDataURL(payload, { width: 256, margin: 1, color: { dark: t.foreground, light: "#00000000" } }).then(setQrDataUrl);
  }, [view, t.foreground]);

  if (!modalOpen) return null;

  const handleConnect = async (conn: Connection) => {
    await persistConnection(conn);
    onConnect?.(conn);
    setModalOpen(false);
  };

  const submitBlink = async () => {
    setError(null);
    setBusy(true);
    try {
      const conn = await validateBlinkAddress(blinkInput);
      await handleConnect(conn);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitNwc = async () => {
    setError(null);
    setBusy(true);
    try {
      const conn = parseNwcUri(nwcInput.trim());
      await handleConnect(conn);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const overlay: CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    padding: 16,
  };

  const card: CSSProperties = {
    background: t.background,
    color: t.foreground,
    border: `1px solid ${t.border}`,
    borderRadius: t.radius,
    width: "100%",
    maxWidth: 420,
    padding: 24,
    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
  };

  const title: CSSProperties = {
    fontSize: 20,
    fontWeight: 600,
    margin: 0,
    letterSpacing: "-0.01em",
  };

  const subtitle: CSSProperties = {
    fontSize: 13,
    color: t.muted,
    margin: "6px 0 20px",
  };

  const optionBtn: CSSProperties = {
    width: "100%",
    background: "transparent",
    color: t.foreground,
    border: `1px solid ${t.border}`,
    borderRadius: t.radius,
    padding: 16,
    cursor: "pointer",
    textAlign: "left",
    marginBottom: 10,
    transition: "border-color 120ms, transform 120ms",
  };

  const tag: CSSProperties = {
    display: "inline-block",
    fontSize: 10,
    fontWeight: 600,
    padding: "2px 7px",
    borderRadius: 999,
    background: `${t.primary}22`,
    color: t.primary,
    marginRight: 4,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };

  const input: CSSProperties = {
    width: "100%",
    background: "transparent",
    color: t.foreground,
    border: `1px solid ${t.border}`,
    borderRadius: t.radius,
    padding: "12px 14px",
    fontSize: 14,
    outline: "none",
    marginBottom: 12,
    fontFamily: "inherit",
    boxSizing: "border-box",
  };

  const primaryBtn: CSSProperties = {
    width: "100%",
    background: t.primary,
    color: "#0A0A0A",
    border: "none",
    borderRadius: t.radius,
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: busy ? "wait" : "pointer",
    opacity: busy ? 0.7 : 1,
  };

  const linkBtn: CSSProperties = {
    background: "transparent",
    border: "none",
    color: t.muted,
    cursor: "pointer",
    fontSize: 13,
    padding: 8,
    width: "100%",
    marginTop: 8,
  };

  const back = (
    <button style={linkBtn} onClick={() => setView("home")}>
      ← Back
    </button>
  );

  return (
    <div style={overlay} onClick={() => setModalOpen(false)}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        {view === "home" && (
          <>
            <h2 style={title}>Connect Wallet</h2>
            <p style={subtitle}>Choose how to receive payments</p>

            <button
              style={optionBtn}
              onClick={() => setView("blink")}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = t.primary)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = t.border)
              }
            >
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
                ⚡ Blink Lightning Address
              </div>
              <div style={{ marginBottom: 6 }}>
                <span style={tag}>Recommended</span>
                <span style={tag}>No API Key</span>
                <span style={tag}>Instant</span>
              </div>
              <div style={{ fontSize: 12, color: t.muted }}>
                Just your Blink username
              </div>
            </button>

            <button
              style={optionBtn}
              onClick={() => setView("nwc")}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = t.primary)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = t.border)
              }
            >
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
                🔗 Nostr Wallet Connect
              </div>
              <div style={{ marginBottom: 6 }}>
                <span style={tag}>Any Wallet</span>
                <span style={tag}>Flexible</span>
                <span style={tag}>Decentralized</span>
              </div>
              <div style={{ fontSize: 12, color: t.muted }}>
                Blink, Alby, Zeus, Coinos
              </div>
            </button>

            <button
              style={linkBtn}
              onClick={() => {
                onSkip?.();
                setModalOpen(false);
              }}
            >
              Skip for now
            </button>
          </>
        )}

        {view === "blink" && (
          <>
            <h2 style={title}>Blink Lightning Address</h2>
            <p style={subtitle}>Enter your username or full address</p>
            <input
              style={input}
              placeholder="satoshi or satoshi@blink.sv"
              value={blinkInput}
              onChange={(e) => setBlinkInput(e.target.value)}
              autoFocus
            />
            {error && (
              <div
                style={{ color: "#ef4444", fontSize: 12, marginBottom: 10 }}
              >
                {error}
              </div>
            )}
            <button
              style={primaryBtn}
              disabled={busy || !blinkInput}
              onClick={submitBlink}
            >
              {busy ? "Validating…" : "Connect"}
            </button>
            {back}
          </>
        )}

        {view === "nwc" && (
          <>
            <h2 style={title}>Nostr Wallet Connect</h2>
            <p style={subtitle}>How would you like to pair?</p>
            <button
              style={optionBtn}
              onClick={() => setView("nwc-qr")}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = t.primary)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = t.border)
              }
            >
              <div style={{ fontSize: 15, fontWeight: 600 }}>📷 Scan QR</div>
              <div style={{ fontSize: 12, color: t.muted, marginTop: 4 }}>
                Scan from your wallet app
              </div>
            </button>
            <button
              style={optionBtn}
              onClick={() => setView("nwc-paste")}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = t.primary)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = t.border)
              }
            >
              <div style={{ fontSize: 15, fontWeight: 600 }}>
                📋 Paste connection string
              </div>
              <div style={{ fontSize: 12, color: t.muted, marginTop: 4 }}>
                nostr+walletconnect://…
              </div>
            </button>
            {back}
          </>
        )}

        {view === "nwc-qr" && (
          <>
            <h2 style={title}>Scan with your wallet</h2>
            <p style={subtitle}>
              Open your NWC-compatible wallet and scan this code
            </p>
            <div
              style={{
                background: "#fff",
                padding: 16,
                borderRadius: t.radius,
                display: "flex",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="NWC pairing QR" width={224} height={224} />
              ) : (
                <div style={{ width: 224, height: 224 }} />
              )}
            </div>
            <button style={linkBtn} onClick={() => setView("nwc-paste")}>
              Paste connection string instead
            </button>
            {back}
          </>
        )}

        {view === "nwc-paste" && (
          <>
            <h2 style={title}>Paste NWC string</h2>
            <p style={subtitle}>
              From your wallet's Nostr Wallet Connect settings
            </p>
            <textarea
              style={{ ...input, minHeight: 96, resize: "vertical" }}
              placeholder="nostr+walletconnect://abc...?relay=wss://...&secret=..."
              value={nwcInput}
              onChange={(e) => setNwcInput(e.target.value)}
              autoFocus
            />
            {error && (
              <div
                style={{ color: "#ef4444", fontSize: 12, marginBottom: 10 }}
              >
                {error}
              </div>
            )}
            <button
              style={primaryBtn}
              disabled={busy || !nwcInput}
              onClick={submitNwc}
            >
              {busy ? "Pairing…" : "Connect"}
            </button>
            {back}
          </>
        )}
      </div>
    </div>
  );
}

export { useWalletConnect };
