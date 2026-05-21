## Internal check: what is broken

1. The app shell is currently rendering in preview, but there are historical internal server errors from the NWC connector.
   - Server logs show repeated failures from `lightningconnect/src/connectors/nwc.ts` caused by a stale `@noble/hashes/utils` import.
   - The current source has been changed to a local `hexToBytes`, so this specific import crash appears resolved in the file, but the logs confirm it was the SSR blank-screen cause.

2. NWC invoice creation is still fragile.
   - `sendNwcRequestOnce()` subscribes and publishes, but NWC relays/wallets can return publish failures or delayed responses.
   - Current code retries only on timeout/connect failure and closes the pool on each attempt, which can still race with slow wallet responses.
   - It also does not clearly validate relay publish acknowledgements before waiting for the response.

3. NWC lookup coverage is incomplete.
   - The current code handles `settled_at`, `preimage`, and `state: "settled"`.
   - It should also normalize common wallet variants like uppercase states/statuses and explicit `paid`, `settled`, or `expired` fields when present.

4. Blink lookup is now mostly correct, but the README/demo contract is misleading.
   - `lookupInvoice(paymentHash)` alone cannot verify a Blink LNURL invoice because the verify URL is not derivable from the payment hash for every provider.
   - The demo passes the full invoice object, which works, but README still shows only `lookupInvoice(invoice.paymentHash)` and would return `PENDING` for Blink forever.

5. The NWC QR flow is not functional.
   - The QR code contains `nostr+walletconnect://?demo=scan-from-your-wallet`, which is an instructional placeholder, not a valid pairing flow.
   - Users scanning it will not connect a wallet. The paste flow is the only real NWC pairing path right now.

6. Demo UX hides important state.
   - Errors are not cleared before lookup, so old errors can linger beside fresh results.
   - There is no displayed payment hash, verify URL, or connection diagnostics, making it hard to know whether lookup is checking the intended invoice.

## Proposed fix plan

1. Harden NWC requests
   - Keep the local `hexToBytes` implementation and ensure no unresolved package subpath imports remain.
   - Refactor `sendNwcRequestOnce()` so subscription is established before publish, publish failures are surfaced, relay cleanup is deterministic, and the retry path is applied to timeout, relay connection, and publish failures.
   - Use a practical timeout strategy: short first attempt, one longer retry, clear user-facing error when both fail.

2. Make invoice status mapping real and provider-tolerant
   - Update NWC `lookupInvoiceNwc()` to map paid only from real settled indicators: `settled_at`, non-empty `preimage`, `state/status === settled/paid/complete`, or explicit `settled/paid === true`.
   - Map expired from `state/status === expired` or explicit expired indicators.
   - Never return `PAID` from generic success/OK responses.

3. Clarify Blink invoice verification
   - Keep Blink lookup based on the LNURL `verify` response.
   - Return `PAID` only for `settled === true` or non-empty `preimage`.
   - Preserve the invoice verify URL in a typed way instead of casting to `Invoice & { verify?: string }` throughout the demo.

4. Fix misleading public API/docs
   - Update the hook typing/docs so Blink callers know to pass the invoice object, or expose a cleaner status lookup API that accepts the invoice returned from `makeInvoice()`.
   - Update README example to use the actual working pattern.

5. Address the non-working NWC QR path
   - Either remove/disable the fake scan QR option, or label it as unavailable and direct users to paste a real wallet connection string.
   - Prefer removing the fake QR for now so users do not scan a dead pairing code.

6. Improve playground diagnostics
   - Clear stale errors before every lookup.
   - Show payment hash and, when present, the Blink verify endpoint.
   - Keep the status display tied to the latest invoice only.

7. Verification after implementation
   - Run targeted checks on the app preview.
   - Test Blink flow using the observed verify endpoint behavior: unpaid returns `PENDING` from `settled:false`; paid should return `PAID` only after the provider reports `settled:true` or preimage.
   - For NWC, verify the UI no longer exposes a fake QR path and that request errors are surfaced clearly instead of causing SSR/runtime failures.