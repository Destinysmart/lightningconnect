# <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>LightningConnect

> **Live demo:** [lightningconnect.lovable.app](https://lightningconnect.lovable.app)

**Zero-friction Bitcoin wallet connection for any web app.**

LightningConnect is a drop-in React widget + hook that solves wallet connection and automatic payment detection for Bitcoin web apps. Blink-native, universally compatible, and built so developers never write polling logic again.

- <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>**Blink-native** — two dedicated Blink connectors (Address + API Key)
- <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>**Universally compatible** — generic Lightning Address + NWC for every other wallet
- <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>**Auto payment detection** — `onPayment` callback fires once, automatically
- <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>**Auto cleanup** — watchers stop on PAID/EXPIRED and on unmount
- <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>**Light & dark mode** — built-in theme toggle with persisted preference
- <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>**Encrypted local storage** — device-bound via Web Crypto
- <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>**<30kb gzipped** — only React as a peer dep

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
| **Blink** | <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Blink Lightning Address | Most users. Just a username, no setup. |
| **Blink** | <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/></svg>Blink API Key | Power users. Full account control. |
| **Other** | ₿ Lightning Address | Any `user@domain` — WoS, Alby, Strike, etc. |
| **Other** | <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-3px;margin-right:6px"><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/></svg>Nostr Wallet Connect (Beta) | Alby Hub, Zeus, Phoenix, Mutiny |

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
