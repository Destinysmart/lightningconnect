# <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>LightningConnect

**Zero-friction Bitcoin wallet connection for any web app. Four connectors across two categories, one component, automatic payment detection.**

LightningConnect is a drop-in React widget + hook that solves the wallet connection AND payment detection problem for Bitcoin web apps. It is Blink-native — with two dedicated Blink connectors no other library ships — and universally compatible with every other wallet via generic Lightning Address and Nostr Wallet Connect. Your app makes invoices and gets a callback when they're paid. No polling code to write.

> **v1.0.0 is here.** Payment detection is now built in. Connect, invoice, and get paid — zero polling code required.

```
npm install lightningconnect
```

## Why

Most Bitcoin payment libraries leave the hard parts to you: polling for payment, cleaning up intervals, handling expiry. LightningConnect ships four browser-side connectors AND built-in payment detection so every user — from casual to power — can pay without you writing a single `setInterval`.

- <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>**Blink-native** — two dedicated Blink connectors (Address + API Key)
- <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>**Universally compatible** — generic Lightning Address + NWC for every other wallet
- <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>**Auto payment detection** — `onPayment` callback fires once, automatically
- <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>**Auto cleanup** — watchers stop on PAID/EXPIRED and on unmount
- <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>**Light & dark mode** — automatic theme switching with persisted preference
- <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>**Encrypted local storage** — device-bound via Web Crypto
- <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>**<30kb gzipped** — only React as a peer dep

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

#### <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Blink Lightning Address
The user types `satoshi` (or `satoshi@blink.sv`). The widget validates the address via `https://blink.sv/.well-known/lnurlp/{username}`, then calls the LNURL-pay callback to mint invoices. No API key, no dashboard. **Recommended for most users.**

#### <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/></svg>Blink API Key (advanced)
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

#### <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/></svg>Nostr Wallet Connect (Beta)
Pair by pasting an `nostr+walletconnect://...` string. The widget talks to the wallet over a Nostr relay using NIP-47: `make_invoice` to mint, `lookup_invoice` for status. Works with **Alby Hub, Zeus, Phoenix, Mutiny** and any NIP-47 compatible wallet.

## Standalone payment watcher

If you need payment detection outside the hook, use `watchPayment` directly:

```ts
import { watchPayment } from "lightningconnect";

const cancel = watchPayment({
  invoice,
  lookup: () => lookupInvoice(paymentHash),
  pollInterval: 5000,
  onPayment: (inv) => console.log("Paid!", inv),
  onExpiry: (inv) => console.log("Expired", inv),
  onError: (err) => console.error(err),
});

// Stop manually
cancel();
```

## Theming

### Dark mode (default)

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

### Light mode

Pass `lightTheme` to define the light appearance, and `defaultMode` to set the starting mode:

```tsx
<LightningConnect
  theme={{ primary: "#F7931A" }}            // dark mode overrides
  lightTheme={{ primary: "#F7931A" }}       // light mode overrides
  defaultMode="light"                       // "light" | "dark"
/>
```

The widget renders a sun/moon toggle in the modal header. The user's choice is persisted to `localStorage` under the key `lightningconnect:mode`. If no `lightTheme` is provided, sensible light defaults are used automatically.

All theme keys are optional in both `theme` and `lightTheme`.

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
