## Goal

Add a third connector — **Blink API Key** — to LightningConnect as an advanced option, wire it through the widget UI, hook, types, and storage, add integration tests, and refresh the landing-page + README copy so "no API keys" claims are removed.

---

## 1. Types (`lightningconnect/src/types.ts`)

- Extend `ConnectionType`: `'blink-address' | 'nwc' | 'blink-api'`.
- Add interface:
  ```ts
  BlinkApiConnection {
    type: 'blink-api';
    apiKey: string;       // blink_...
    walletId: string;     // resolved BTC wallet id
    walletName: string;   // user-supplied label, default "My Blink Wallet"
    walletCurrency: 'BTC' | 'USD';
  }
  ```
- Union `Connection` includes it.

## 2. New connector (`lightningconnect/src/connectors/blink-api.ts`)

Endpoint: `https://api.blink.sv/graphql`, header `X-API-Key: <key>`.

- `validateBlinkApiKey(apiKey, walletName?)` → runs `query { me { defaultAccount { wallets { id walletCurrency } } } }`. Picks the BTC wallet (fallback first wallet). Throws on network error, GraphQL errors, or empty wallets. Returns a `BlinkApiConnection`.
- `makeInvoiceBlinkApi(conn, amount, currency, memo)`:
  - `USD` → `lnUsdInvoiceCreate` with `{ walletId, amount: usdCents, memo }`.
  - `BTC` → `lnInvoiceCreate` with `{ walletId, amount: sats, memo }`.
  - Map response → `Invoice { bolt11: paymentRequest, paymentHash, amount: satoshis, memo, createdAt: now, expiresAt }`. Throw on `errors[]`.
- `lookupInvoiceBlinkApi(conn, paymentHash)`:
  - `query lnInvoicePaymentStatus(input: { paymentHash })`.
  - Map `PAID → 'PAID'`, `PENDING → 'PENDING'`, `EXPIRED → 'EXPIRED'`. Errors → `'PENDING'` (consistent with NWC).
- Internal helper `blinkGraphql(apiKey, query, variables)` for fetch + GraphQL error handling.

## 3. Hook routing (`lightningconnect/src/hooks/useWalletConnect.ts`)

In `makeInvoice` / `lookupInvoice`, add `connection.type === 'blink-api'` branches that delegate to the new connector. Extend `walletInfo` mapping:
- `name`: `connection.walletName`
- `address`: masked key, e.g. `blink_…${apiKey.slice(-4)}`
- `currency`: `connection.walletCurrency`

## 4. Connector barrel (`lightningconnect/src/connectors/index.ts`)

New file re-exporting the three connectors as `blinkAddressConnector`, `nwcConnector`, `blinkApiConnector` plus existing named functions, so consumers can import from one place.

## 5. Widget UI (`lightningconnect/src/widget.tsx`)

- Extend `View` with `'blink-api'`.
- Add a third option button on the home view (under NWC) following the supplied spec — label `Blink API Key`, tags `Advanced`, `Full Control`, subtitle `For power users`, lucide `KeyRound` icon.
- New `blink-api` view containing:
  - Wallet name input (placeholder `My Blink Wallet`, optional).
  - API key input (`blink_…`) with a **Paste** button on the right that calls `navigator.clipboard.readText()`.
  - Inline numbered guide: `1. Go to dashboard.blink.sv → 2. Navigate to API Keys → 3. Create key with READ + RECEIVE scopes`.
  - Security note: `Your API key is encrypted and stored securely on your device.`
  - Connect button → `validateBlinkApiKey` → `handleConnect`. Surface success/error inline before saving.
- Reset new state fields in the modal-close `useEffect`.

## 6. Tests (`lightningconnect/src/connectors/blink-api.test.ts`)

Vitest suite mocking `fetch` with fixture GraphQL responses:
- `validateBlinkApiKey` — success picks BTC wallet, throws on GraphQL errors, throws on no wallets.
- `makeInvoiceBlinkApi` — BTC path calls `lnInvoiceCreate` with sats; USD path calls `lnUsdInvoiceCreate` with cents; both map response correctly; `errors[]` surfaces as thrown.
- `lookupInvoiceBlinkApi` — PAID / PENDING / EXPIRED mapping; network/GraphQL error → `PENDING`; never hardcodes PAID.

## 7. Landing page copy (`src/routes/index.tsx`)

- Update subheadline to the supplied three-connector copy.
- Replace the two-card features grid with three cards using the supplied descriptions (Lightning Address / NWC / Blink API Key) with lucide `Zap`, `Link2`, `KeyRound`.
- Remove any remaining "no API keys" / "no backend" claims; keep tagline "One component. Every user covered."
- Update `<head>` `meta description` accordingly.

## 8. README & package metadata

- `lightningconnect/README.md`: new tagline, three-connector overview section, Blink API Key setup steps (dashboard.blink.sv → API Keys → READ + RECEIVE scopes), updated hook signature note (`connectionType` includes `'blink-api'`).
- `lightningconnect/package.json`: update `description` field to the new npm package description.

## 9. Out of scope

- No changes to storage encryption (existing AES-GCM path already handles the new shape — `BlinkApiConnection` is serializable).
- No SDK dependency on `@galoy/client`; we call the GraphQL endpoint with `fetch` directly to keep bundle size flat.
- No UI changes to existing Blink-address / NWC flows beyond the new home-screen entry.

## Verification

1. `bunx vitest run` — all existing 22 NWC tests still pass + new Blink-API suite green.
2. Manual: open widget → see three options → connect via Blink API key (mock or real) → make invoice in BTC and USD → lookup returns correct status.
3. Landing page renders three feature cards with no stale "no API keys" copy.
