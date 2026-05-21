## Goal

Make `makeInvoice()` reliable over NWC and ensure `lookupInvoice()` returns the real on-chain/Lightning status for both NWC and Blink Lightning Address. No hardcoded statuses anywhere.

## Current state (already in the codebase)

- `lightningconnect/src/connectors/nwc.ts` — `sendNwcRequest` now:
  - Calls `pool.ensureRelay(relay, { connectionTimeout: 10000 })` so the WS is open before publishing.
  - First attempt uses a 10s response timeout; on timeout / connect failure it retries once with a 30s timeout.
  - Cleans up subscription + pool on every resolve/reject/timeout path.
  - `lookupInvoiceNwc` sends a real `lookup_invoice` NWC request and returns `PAID` only when `settled_at` or `preimage` is present; `EXPIRED` when the relay error says expired; otherwise `PENDING`. No hardcoded `PAID`.
- `lightningconnect/src/connectors/blink-address.ts` — `lookupInvoiceBlink(paymentHash, verify?)` fetches the LNURL `verify` URL returned by the callback and returns `PAID` only when `settled === true` (or `status === "OK"` plus settled). Otherwise `PENDING`.
- `src/routes/index.tsx` — demo passes the full invoice (including `verify`) into `lookupInvoice` so the Blink path actually hits the verify URL.
- `useWalletConnect` — no hardcoded statuses; routes to the correct connector by `connection.type`.

## Remaining work in this plan

1. Re-verify Blink semantics against the live response shape we observed:
   - `verify` response is `{"status":"OK","settled":false,"preimage":null}` while unpaid → must map to `PENDING`.
   - Once paid the same endpoint returns `settled:true` (and a non-null `preimage`) → must map to `PAID`.
   - Current code only checks `data.settled || data.status === "OK"` — `status === "OK"` is **always** true even when unpaid, so this would falsely return `PAID`. **Fix:** rely on `settled === true` (and/or `preimage` truthy), ignore `status`.

2. NWC `lookup_invoice` response shape across wallets (Alby, Coinos, Mutiny) sometimes uses `state: "settled" | "pending"` instead of `settled_at`. Broaden the check:
   - `PAID` when `settled_at` truthy, OR `preimage` truthy, OR `state === "settled"`.
   - `PENDING` otherwise.

3. Manual QA in the live playground after the edits:
   - Connect via NWC → `makeInvoice(1000, BTC, "Coffee")` must return a `bolt11` without timing out.
   - Without paying, click `lookupInvoice()` → must show `PENDING`.
   - Pay the invoice from another wallet, click `lookupInvoice()` again → must show `PAID`.
   - Repeat with the Blink Lightning Address connector.

## Technical details

File: `lightningconnect/src/connectors/blink-address.ts`
- Change the final check in `lookupInvoiceBlink` from:
  `if (data.settled || data.status === "OK") return "PAID";`
  to:
  `if (data.settled === true || data.preimage) return "PAID";`

File: `lightningconnect/src/connectors/nwc.ts`
- In `lookupInvoiceNwc`, extend the result type to `{ settled_at?: number; preimage?: string; state?: string }` and treat `state === "settled"` as `PAID`.

No changes needed to `useWalletConnect`, the widget, or `src/routes/index.tsx` — the timeout/retry/ensureRelay work from the previous turn stays as-is.

## Out of scope

- Adding background polling in the demo (user explicitly clicks `lookupInvoice()`).
- Persisting invoice history.
- Multi-relay fallback for NWC (single relay from the connection string is sufficient for the stated bug).
