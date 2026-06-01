# Publish lightningconnect 1.0.0 to npm

## Diagnosis

The npm registry currently has only `lightningconnect@0.1.0` (published 2026-05-21). The local `lightningconnect/package.json` is `1.0.0` and contains all recent work:

- Built-in payment watcher (`watchPayment`, `onPayment`/`onExpiry` callbacks)
- Four connectors (Blink Address, Blink API Key, generic Lightning Address, NWC)
- Light/dark mode with persisted toggle
- Modal scroll/height fix

When apps run `npm install lightningconnect`, npm serves 0.1.0 — none of the updates are present in their `node_modules`. This is why integrators report "updates not reflecting." It is a release/publish issue, not a code bug.

## Plan

### 1. Pre-publish verification (I'll do this)

- Re-confirm the published version on npm vs local `package.json`.
- Verify `lightningconnect/package.json` is `1.0.0`, has correct `main`/`module`/`types`/`exports`/`files` fields.
- Run the library build (`cd lightningconnect && bun run build`) and confirm `dist/` contains `index.esm.js`, `index.cjs.js`, `index.d.ts`.
- Run the test suite (45 tests) to confirm green.
- Inspect what would be published with `npm pack --dry-run` (file list + tarball size).

### 2. Small package.json polish (only if missing)

- Confirm `repository`, `homepage`, and `bugs` fields exist (helps npm page + integrators trust the package). Add minimally if missing.
- Make sure `prepublishOnly: "bun run build"` script exists so a fresh `dist/` is always shipped.

### 3. Publish (you do this — needs your npm auth)

I can't run `npm publish` because it requires your npm login token. Once step 1 is green, you run from the repo root:

```bash
cd lightningconnect
npm login            # one-time, if not already logged in
npm publish --access public
```

Then verify:

```bash
npm view lightningconnect version    # should print 1.0.0
```

### 4. Tell integrators how to pick up the update

In their app:

```bash
npm install lightningconnect@latest
# or pin: npm install lightningconnect@1.0.0
```

If they had `^0.1.0` in their `package.json`, npm will NOT auto-upgrade to 1.0.0 (major bump). They must explicitly install `@latest` or `@1.0.0` and update the range.

## Technical notes

- Version jump 0.1.0 → 1.0.0 is a major bump. That's intentional (new public APIs: `onPayment`, `watchPayment`, `lightTheme`, `defaultMode`, new connectors). No semver issue.
- The package is unscoped and public — no `.npmrc` or registry config needed.
- `files: ["dist", "README.md"]` already restricts the tarball correctly.
- No build secrets required for publishing; npm publish is done from your local machine, not from Lovable.

## Deliverable

After this plan runs you'll have: confirmed build artifacts, a green test run, a `npm pack --dry-run` report of exactly what will ship, and the two commands to publish + verify.
