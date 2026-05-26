# ⚡ LightningConnect

**Zero-friction Bitcoin wallet connection for any web app. Four connectors across two categories, one component, automatic payment detection.**

LightningConnect is a drop-in React widget + hook that solves the wallet connection AND payment detection problem for Bitcoin web apps. It is Blink-native — with two dedicated Blink connectors no other library ships — and universally compatible with every other wallet via generic Lightning Address and Nostr Wallet Connect. Your app makes invoices and gets a callback when they're paid. No polling code to write.

> **One component. Every user covered.**

```
npm install lightningconnect
```

## Why

Most Bitcoin payment libraries leave the hard parts to you: polling for payment, cleaning up intervals, handling expiry. LightningConnect ships four browser-side connectors AND built-in payment detection so every user — from casual to power — can pay without you writing a single `setInterval`.

- ⚡ **Blink-native** — two dedicated Blink connectors (Address + API Key)
- 🌐 **Universally compatible** — generic Lightning Address + NWC for every other wallet
- 🔁 **Auto payment detection** — `onPayment` callback fires once, automatically
- 🧹 **Auto cleanup** — watchers stop on PAID/EXPIRED and on unmount
- 🔒 **Encrypted local storage** — device-bound via Web Crypto
- 📦 **<30kb gzipped** — only React as a peer dep

## Quick start

```tsx
import { LightningConnect, useWalletConnect } from "lightningconnect";

export default function App() {
  const { connect, isConnected, makeInvoice } = useWalletConnect({
    onPayment: (invoice) => alert(`Paid: ${invoice.amount} sats`),
    onExpiry: (invoice) => console.log("Expired", invoice.paymentHash),
  });

  return (
    <>
      <LightningConnect theme={{ primary: "#F7931A" }} />
      {isConnected ? (
        <button onClick={() => makeInvoice(1000, "BTC", "Coffee")}>
          Get paid 1000 sats
        </button>
      ) : (
        <button onClick={connect}>Connect wallet</button>
      )}
    </>
  );
}
```

That's it. No `setInterval`, no `useEffect`, no cleanup. LightningConnect starts watching as soon as `makeInvoice()` resolves and fires `onPayment` exactly once when it settles.

## Before & after

### Before — manual polling

```tsx
const invoice = await makeInvoice(1000, "BTC", "Coffee");
const interval = setInterval(async () => {
  const status = await lookupInvoice(invoice.paymentHash, invoice);
  if (status === "PAID") {
    clearInterval(interval);
    handlePayment(invoice);
  } else if (status === "EXPIRED") {
    clearInterval(interval);
    handleExpiry(invoice);
  }
}, 5000);
// …remember to clearInterval on unmount, on navigation, on error…
```

### After — built-in `onPayment`

```tsx
const { makeInvoice } = useWalletConnect({
  onPayment: handlePayment,
  onExpiry: handleExpiry,
});
await makeInvoice(1000, "BTC", "Coffee");
// done. LightningConnect handles polling, dedupe, expiry, and cleanup.
```

`BlinkInvoice`-style components (the reference implementation) used to wrap a `setInterval` lookup loop. The recommended migration is to drop the loop entirely and use `onPayment` on the parent hook.

## The hook

```ts
const {
  connect,         // () => void — opens the connect modal
  disconnect,      // () => void — clears the stored connection
  isConnected,     // boolean
  connectionType,  // 'blink-address' | 'nwc' | 'blink-api' | null
  makeInvoice,     // (amount, 'USD' | 'BTC', memo) => Promise<Invoice>
  lookupInvoice,   // (paymentHash, invoice?) => Promise<'PAID' | 'PENDING' | 'EXPIRED'>
  cancelWatch,     // (invoice) => void — stop watching a specific invoice
  walletInfo,      // { name, address, currency } | null
} = useWalletConnect({
  onPayment,        // (invoice) => void — fires exactly once when PAID
  onExpiry,         // (invoice) => void — fires when EXPIRED
  onError,          // (error, invoice) => void — lookup errors (non-fatal)
  pollInterval,     // number — defaults to 5000ms
});
```

### Guarantees

- **`onPayment` fires exactly once** per invoice, even if polling overlaps the PAID transition.
- **Watchers stop automatically** on PAID, EXPIRED, or when `invoice.expiresAt` is reached.
- **Component unmount cancels all active watchers** — no leaked timers.
- **`cancelWatch(invoice)`** lets you stop watching manually (e.g. user navigated away).

### Per-connector behaviour

| Connector | Polling primitive | PAID signal | EXPIRED signal |
| --- | --- | --- | --- |
| Blink Lightning Address | LNURL `verify` URL | `settled: true` | `expiresAt` past |
| Lightning Address (any) | LNURL `verify` URL | `settled: true` | `expiresAt` past |
| NWC | `lookup_invoice` request | `settled_at`, `preimage`, `state === paid` | `state === expired` |
| Blink API Key | `lnInvoicePaymentStatus` query | `status === PAID` | `status === EXPIRED` |

## The four connectors

LightningConnect groups its connectors into two categories — **Blink** (native, premium) and **Other Wallets** (universal compatibility).

### Blink

#### ⚡ Blink Lightning Address
The user types `satoshi` (or `satoshi@blink.sv`). The widget validates the address via `https://blink.sv/.well-known/lnurlp/{username}`, then calls the LNURL-pay callback to mint invoices. No API key, no dashboard. **Recommended for most users.**

#### 🔑 Blink API Key (advanced)
Full control for power users. Paste a Blink API key and LightningConnect talks directly to `https://api.blink.sv/graphql`, unlocking BTC + USD invoice creation, real-time payment status, transaction history, balance, and the full account surface.

**Setup:**
1. Open [dashboard.blink.sv](https://dashboard.blink.sv)
2. Navigate to **API Keys**
3. Create a key with **READ + RECEIVE** scopes
4. Paste it into the widget

Your API key is encrypted with AES-GCM and stored on-device — it never leaves the browser.

### Other Wallets

#### ₿ Lightning Address
Any standard Lightning Address (`you@walletofsatoshi.com`, `you@coinos.io`, `you@strike.me`, …). Resolved via standard LNURL-pay (`/.well-known/lnurlp/{user}`), so it works with **Wallet of Satoshi, Alby, Coinos, Strike** and every other Lightning Address provider.

#### 🔗 Nostr Wallet Connect (Beta)
Pair by pasting an `nostr+walletconnect://...` string. The widget talks to the wallet over a Nostr relay using NIP-47: `make_invoice` to mint, `lookup_invoice` for status. Works with **Alby Hub, Zeus, Phoenix, Mutiny** and any NIP-47 compatible wallet.

## Theming

```tsx
<LightningConnect
  theme={{
    primary: "#F7931A",
    background: "#0A0A0A",
    foreground: "#F5F5F5",
    border: "#262626",
    radius: "14px",
    muted: "#A1A1AA",
  }}
/>
```

All theme keys are optional.

## Storage & portability

Connections are encrypted with AES-GCM using a key derived from a device fingerprint via PBKDF2 and stored in `localStorage`.

```ts
import { exportConnection, importConnection } from "lightningconnect";

const token = await exportConnection();
await importConnection(token);
```

## Build output

- ESM + CJS bundles
- Full TypeScript types
- <30kb gzipped (excluding peer React)

## License

MIT.
