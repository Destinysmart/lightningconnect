# ⚡ LightningConnect

**Zero-friction Bitcoin wallet connection for any web app. Three connectors, one component, no friction.**

LightningConnect is a drop-in React widget + hook that solves the wallet connection problem for Bitcoin web apps. Users connect with a Blink Lightning address, any Nostr Wallet Connect (NWC) compatible wallet, or — for power users — a Blink API Key. Your app can make and verify invoices in two lines of code.

> **One component. Every user covered.**

```
npm install lightningconnect
```

## Why

Most Bitcoin payment libraries assume you have an LNbits node, a Strike account, or some hosted service to run. LightningConnect ships three browser-side connectors so every user — from casual to power — can pay without leaving your app.

- ⚡ **Instant onboarding** — a Blink username is enough
- 🔗 **Any NWC wallet** — Alby, Zeus, Coinos, Mutiny, and more
- 🔑 **Power-user mode** — Blink API Key unlocks full account access
- 🔒 **Encrypted local storage** — device-bound via Web Crypto
- 📦 **<30kb gzipped** — only React as a peer dep
- 🎨 **Themeable** — match your app's brand


## Quick start

```tsx
import { LightningConnect, useWalletConnect } from "lightningconnect";

export default function App() {
  const { connect, isConnected, makeInvoice, lookupInvoice } = useWalletConnect();

  const handlePay = async () => {
    const invoice = await makeInvoice(5000, "USD", "Invoice #001");
    console.log("bolt11:", invoice.bolt11);

    // Pass the full invoice object so Blink/LNURL verify URLs are used.
    const status = await lookupInvoice(invoice.paymentHash, invoice);
    console.log("status:", status); // PAID | PENDING | EXPIRED
  };


  return (
    <>
      <LightningConnect
        theme={{ primary: "#F7931A", background: "#0A0A0A" }}
        onConnect={(wallet) => console.log("Connected:", wallet)}
      />
      {isConnected ? (
        <button onClick={handlePay}>Generate invoice</button>
      ) : (
        <button onClick={connect}>Connect wallet</button>
      )}
    </>
  );
}
```

That's it. The widget renders nothing until `connect()` is called.

## The three connectors

### ⚡ Blink Lightning Address
The user types `satoshi` (or `satoshi@blink.sv`). The widget validates the address by hitting `https://blink.sv/.well-known/lnurlp/{username}`. To create an invoice, LightningConnect calls the LNURL-pay callback with the amount in millisats and returns the resulting bolt11. No API key, no dashboard, no setup.

### 🔗 Nostr Wallet Connect
Pair by pasting an `nostr+walletconnect://...` string. The widget then talks to the wallet over a Nostr relay using NIP-47: `make_invoice` to mint, `lookup_invoice` for real-time status. Works with **Blink, Alby, Zeus, Coinos, Mutiny** and any other NWC-compatible wallet.

### 🔑 Blink API Key (advanced)
Full control for power users. Paste a Blink API key and LightningConnect talks directly to `https://api.blink.sv/graphql`, unlocking BTC + USD invoice creation, real-time payment status, and the full account surface.

**Setup:**
1. Open [dashboard.blink.sv](https://dashboard.blink.sv)
2. Navigate to **API Keys**
3. Create a key with **READ + RECEIVE** scopes
4. Paste it into the widget

Your API key is encrypted with AES-GCM and stored on-device — it never leaves the browser.

## The hook

```ts
const {
  connect,         // () => void — opens the connect modal
  disconnect,      // () => void — clears the stored connection
  isConnected,     // boolean
  connectionType,  // 'blink-address' | 'nwc' | 'blink-api' | null
  makeInvoice,     // (amount, 'USD' | 'BTC', memo) => Promise<Invoice>
  lookupInvoice,   // (paymentHash, invoice?) => Promise<'PAID' | 'PENDING' | 'EXPIRED'>
  walletInfo,      // { name, address, currency } | null
} = useWalletConnect();
```


## Theming

```tsx
<LightningConnect
  theme={{
    primary: "#F7931A",     // accent color
    background: "#0A0A0A",  // modal background
    foreground: "#F5F5F5",  // text color
    border: "#262626",      // border color
    radius: "14px",         // border radius
    muted: "#A1A1AA",       // secondary text
  }}
/>
```

All theme keys are optional — anything you don't pass falls back to a sensible dark default.

## Storage & portability

Connection data is encrypted with AES-GCM using a key derived from a device fingerprint via PBKDF2 and stored in `localStorage`. It never leaves the browser.

```ts
import { exportConnection, importConnection } from "lightningconnect";

const token = await exportConnection(); // base64 string — paste this on another device
await importConnection(token);          // restore on the new device
```

## Build output

- ESM + CJS bundles
- Full TypeScript types
- <30kb gzipped (excluding peer React)
- Zero required peer dependencies except React

## License

MIT.
