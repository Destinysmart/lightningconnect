## Goal

Fix the NWC `make_invoice` timeout against `wss://relay.coinos.io`. The relay and connection string are confirmed working — the bug is inside `lightningconnect/src/connectors/nwc.ts`.

## Changes (single file: `lightningconnect/src/connectors/nwc.ts`)

### 1. Guarantee subscribe-before-publish with a small settle delay
In `sendNwcRequestOnce()`:
- Keep `pool.ensureRelay()` first.
- Create the `subscribeMany()` subscription.
- `await new Promise(r => setTimeout(r, 500))` so the relay registers the REQ before we publish the event.
- Only then call `pool.publish(relays, event)`.

### 2. Log raw relay traffic for debugging
- Log `[NWC] publishing request` with method, event id, relay.
- In `onevent`, log `[NWC] raw response event` with `ev.id`, `ev.kind`, and the decrypted JSON string before parsing.
- Log publish ack results (`[NWC] publish acks`) including any rejection reason.
- Log timeout firing with elapsed ms.

### 3. Do not close the pool until response is fully parsed
- Move the `cleanup()` call in `onevent` to AFTER `JSON.parse` succeeds and we have resolved/rejected with the final value (current code already does this, but verify ordering and ensure `pool.close` is the very last step, after `sub.close`).
- On publish: if all acks reject, cleanup and throw. If at least one ack resolves, keep pool open and let the response promise drive cleanup.

### 4. Accept Coinos response shape variants in `makeInvoiceNwc`
Broaden the `sendNwcRequest` generic for `make_invoice` to:
```ts
{
  invoice?: string;
  payment_request?: string;
  bolt11?: string;
  payment_hash?: string;
  hash?: string;
  amount?: number;
  created_at?: number;
  expires_at?: number;
}
```
Then resolve:
- `bolt11 = result.invoice ?? result.payment_request ?? result.bolt11`
- `paymentHash = result.payment_hash ?? result.hash`
- Throw a clear error if `bolt11` is missing, including `JSON.stringify(result)` so we can see Coinos's exact shape.

### 5. Keep existing retry/timeout strategy
- First attempt 15s, retry 30s on timeout / connect / publish failure. No other behavior changes.

## Verification

1. Reload preview, open NWC paste flow, paste the Coinos string, click Connect.
2. Click "Make invoice" in the playground.
3. Expect console to show: `[NWC] publishing request` → `[NWC] publish acks` (≥1 fulfilled) → `[NWC] raw response event` with decrypted JSON → invoice rendered with `bolt11` and `payment_hash`.
4. Without paying, click "Lookup invoice" → status `PENDING`.
5. Pay invoice from any wallet, click "Lookup invoice" again → status `PAID`.
6. If it still times out, the console logs from step 3 will reveal whether (a) publish was rejected, (b) no response event arrived, or (c) Coinos returned an unexpected field set — then we iterate.

## Out of scope

No changes to Blink connector, widget UI, demo route, or types — this is a focused fix on the NWC request path only.
