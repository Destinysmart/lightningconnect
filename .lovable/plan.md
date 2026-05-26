## Goal

Reorganize the LightningConnect widget into two visually-grouped sections — **Blink** (native, premium) and **Other Wallets** (universal) — exposing four connector entry points instead of three. Update the landing page and README to match.

## UI changes — `lightningconnect/src/widget.tsx`

Home view replaces the flat 3-button list with two labeled groups:

```text
Connect Wallet
Choose how to receive payments

── BLINK ──────────────────────────       (warm-tinted panel)
  ⚡ Blink Lightning Address
     [Recommended] [Instant]
     Just your Blink username

  🔑 Blink API Key
     [Advanced] [Full Control]
     Transaction history + balance access

── OTHER WALLETS ──────────────────
  ₿  Lightning Address
     [Universal]
     Wallet of Satoshi, Alby, Coinos, Strike and more

  🔗 Nostr Wallet Connect
     [Beta] [Any NWC Wallet]
     Alby Hub, Zeus, Phoenix and any NWC compatible wallet

  Skip for now
```

Implementation notes:
- Add a `SectionDivider` inline component rendering a small uppercase label with hairline rules on each side, using theme `muted` and `border` tokens.
- Wrap the Blink group in a container with a subtle warm tint (e.g. `background: ${primary}0A`, 1px border, same radius) so it reads as one card. Other Wallets group stays unstyled (flush against the modal background).
- Add a new `View` value: `"ln-address"` for the generic Lightning Address flow. Keep `"blink"`, `"nwc"`, `"nwc-paste"`, `"blink-api"` as-is.
- Icons: keep `Zap` for Blink address, `KeyRound` for Blink API, `Link2` for NWC. Use the lucide `Bitcoin` icon for the generic Lightning Address option.

### New generic "Lightning Address" view

Reuses `validateBlinkAddress` (it already parses `user@domain.tld` and fetches `https://{domain}/.well-known/lnurlp/{user}`) — only the UX differs:
- Placeholder: `satoshi@walletofsatoshi.com`
- Validation: require the input to contain `@` before calling `validateBlinkAddress`; show "Enter a full Lightning Address like `you@wallet.com`" otherwise. (The existing Blink view keeps its `username` shortcut.)
- Submit path calls the same connector and stores the same `blink-address` connection shape — no type or storage changes.

### Wording tweaks
- Blink view subtitle stays "Enter your username or full address".
- NWC option subtext changes from "Blink, Alby, Zeus, Coinos" to "Alby Hub, Zeus, Phoenix and any NWC compatible wallet" (Blink is no longer name-dropped here since it has its own section).

## Landing page — `src/routes/index.tsx`

Update the connector showcase / feature list to mirror the two-category split: a "Blink-native" group highlighting Address + API Key, and an "Other Wallets" group highlighting generic Lightning Address + NWC. No business-logic changes; copy and section layout only.

## README — `lightningconnect/README.md`

Replace "The three connectors" section with "The four connectors", organized as:

- **Blink**
  - Blink Lightning Address (recommended, instant)
  - Blink API Key (advanced, full account access)
- **Other Wallets**
  - Lightning Address (any `user@domain.tld`, LNURL-pay)
  - Nostr Wallet Connect (Beta — Alby Hub, Zeus, Phoenix, any NIP-47 wallet)

Update the tagline paragraph and the "Why" bullets to say "four connectors" and mention the Blink-native positioning. Per-connector behaviour table grows by one row for generic Lightning Address (same primitives as the Blink address row).

## Out of scope

- No changes to `types.ts`, storage, connectors, or the `useWalletConnect` hook.
- No version bump.
- No tab/multi-screen redesign — single scrollable modal as today.

## Technical summary

Files touched:
- `lightningconnect/src/widget.tsx` — section grouping, warm-tinted Blink panel, new `ln-address` view, NWC subtext tweak.
- `lightningconnect/README.md` — four-connector docs under two categories.
- `src/routes/index.tsx` — landing page connector showcase reorganized into Blink / Other Wallets.
