# ⚡ LightningConnect

> **Live demo:** [lightningconnect.lovable.app](https://lightningconnect.lovable.app)

**Zero-friction Bitcoin wallet connection for any web app.**

LightningConnect is a drop-in React widget + hook that solves wallet connection and automatic payment detection for Bitcoin web apps. Blink-native, universally compatible, and built so developers never write polling logic again.

- ⚡ **Blink-native** — two dedicated Blink connectors (Address + API Key)
- 🌐 **Universally compatible** — generic Lightning Address + NWC for every other wallet
- 🔁 **Auto payment detection** — `onPayment` callback fires once, automatically
- 🧹 **Auto cleanup** — watchers stop on PAID/EXPIRED and on unmount
- 🌗 **Light & dark mode** — built-in theme toggle with persisted preference
- 🔒 **Encrypted local storage** — device-bound via Web Crypto
- 📦 **<30kb gzipped** — only React as a peer dep

```bash
npm install lightningconnect
```

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

No `setInterval`, no `useEffect`, no cleanup. LightningConnect starts watching as soon as `makeInvoice()` resolves and fires `onPayment` exactly once when it settles.

## The four connectors

LightningConnect groups its connectors into two categories — **Blink** (native, premium) and **Other Wallets** (universal compatibility).

| Category | Connector | Best for |
|----------|-----------|----------|
| **Blink** | ⚡ Blink Lightning Address | Most users. Just a username, no setup. |
| **Blink** | 🔑 Blink API Key | Power users. Full account control. |
| **Other** | ₿ Lightning Address | Any `user@domain` — WoS, Alby, Strike, etc. |
| **Other** | 🔗 Nostr Wallet Connect (Beta) | Alby Hub, Zeus, Phoenix, Mutiny |

## This repo

This repository contains two things:

1. **`/lightningconnect/`** — the npm package (source, tests, build config)
2. **`/src/`** — the marketing site and live playground at [lightningconnect.lovable.app](https://lightningconnect.lovable.app)

### Package structure

```
lightningconnect/
├── src/
│   ├── widget.tsx              # <LightningConnect /> modal component
│   ├── hooks/
│   │   └── useWalletConnect.ts # Core hook with payment detection
│   ├── connectors/             # Blink Address, Blink API, LNURL, NWC
│   ├── lib/
│   │   └── paymentWatcher.ts   # Standalone watchPayment utility
│   └── index.ts                # Public exports
├── README.md                   # Full package docs
├── package.json
└── ...
```

### Site structure

```
src/
├── routes/
│   ├── index.tsx               # Landing page + live playground
│   └── readme.tsx              # Inline README viewer
├── router.tsx
└── ...
```

## Running locally

```bash
# Install dependencies
bun install

# Run tests
bun test

# Start dev server (site + playground)
bun run dev

# Build package
bun run build:lib
```

## Documentation

Full API documentation lives in [`lightningconnect/README.md`](./lightningconnect/README.md) and covers:

- `useWalletConnect` hook API and callbacks
- `watchPayment` standalone utility
- Connector details and setup instructions
- Theming (dark mode, light mode, custom overrides)
- Encrypted storage and export/import
- TypeScript types

## License

MIT.
