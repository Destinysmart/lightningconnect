# ⚡ LightningConnect

**Zero-friction Bitcoin wallet connection for any web app.**

LightningConnect is a drop-in React widget + hook that solves the wallet connection problem for Bitcoin web apps. No API keys. No dashboard. No backend. Users connect with a Blink Lightning address or any Nostr Wallet Connect (NWC) compatible wallet, and your app can make and verify invoices in two lines of code.

```
npm install lightningconnect
```

## Why

Most Bitcoin payment libraries assume you have an LNbits node, a Strike account, or some hosted service with API keys. LightningConnect assumes nothing. Your users bring their own wallet — Blink, Alby, Zeus, Coinos, Mutiny, anything that speaks NWC — and your app talks to it directly from the browser.

- 🔑 **No API keys** — runs entirely client-side
- ⚡ **Instant onboarding** — a Blink username is enough
- 🔗 **Any wallet** — full NWC (NIP-47) support
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

## The two connectors

### ⚡ Blink Lightning Address
The user types `satoshi` (or `satoshi@blink.sv`). The widget validates the address by hitting `https://blink.sv/.well-known/lnurlp/{username}`. To create an invoice, LightningConnect calls the LNURL-pay callback with the amount in millisats and returns the resulting bolt11. No API key, ever.

### 🔗 Nostr Wallet Connect
Pair by scanning a QR code from your wallet or pasting an `nostr+walletconnect://...` string. The widget then talks to the wallet over a Nostr relay using NIP-47: `make_invoice` to mint, `lookup_invoice` for real-time status. Works with **Blink, Alby, Zeus, Coinos, Mutiny** and any other NWC-compatible wallet.

## The hook

```ts
const {
  connect,         // () => void — opens the connect modal
  disconnect,      // () => void — clears the stored connection
  isConnected,     // boolean
  connectionType,  // 'blink-address' | 'nwc' | null
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
