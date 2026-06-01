## What's actually blocking integration

I verified against the live npm registry and GitHub, and found two concrete blockers (not just CLI noise on your Windows machine):

### Blocker 1 — npm still serves `0.1.0`, and 0.1.0 does NOT contain the v1.0.0 API

`npm view lightningconnect` returns `0.1.0`. I downloaded the tarball and inspected `dist/index.d.ts`. The published API is:

```ts
export declare function useWalletConnect(): { ... }   // takes NO arguments
// no watchPayment export
// no onPayment / onExpiry / onError / pollInterval options
// LightningConnect props: only { theme, onConnect, onSkip } — no lightTheme, no defaultMode
```

But the README (and the source in `lightningconnect/src/`) documents:

```ts
useWalletConnect({ onPayment, onExpiry, onError, pollInterval })
watchPayment({ invoice, lookup, onPayment, ... })
<LightningConnect lightTheme={...} defaultMode="light" />
```

So any developer who runs `npm install lightningconnect` today gets a package whose code does not match a single example in the README. Every snippet on the README page fails at runtime or typecheck. **This is the real blocker** — not stale docs, not a Lovable bug. The 1.0.0 publish from your Windows machine never reached the registry.

### Blocker 2 — `repository.url` in `package.json` points to a 404 GitHub repo

`lightningconnect/package.json` declares:

```json
"repository": { "url": "https://github.com/lightningconnect/lightningconnect.git" }
"bugs":       { "url": "https://github.com/lightningconnect/lightningconnect/issues" }
```

`GET https://api.github.com/repos/lightningconnect/lightningconnect` → `404 Not Found`. The org/repo does not exist. npm will publish this, but:
- The "Repository" and "Issues" links on the npmjs.com package page are broken
- Tools that auto-resolve provenance / source (Socket, Snyk, Renovate, GitHub Dependabot) will flag the package as suspicious or unverifiable
- Some corporate registries refuse packages with unreachable repo URLs

## Plan

1. **Unblock the npm publish first** — until `npm view lightningconnect version` prints `1.0.0`, nothing else matters. The Windows-side commands already given (clean `node_modules` + `package-lock.json` in the package folder, upgrade npm to 11.16.0 or downgrade to npm 10 LTS, then `npm pack --dry-run` to confirm version 1.0.0 and only `dist/ + README.md + package.json`, then `npm publish --access public`) are still the correct fix. If it fails again, the npm debug log under `%LocalAppData%\npm-cache\_logs\` is needed to pinpoint the CLI crash.

2. **Fix the repository URL before republishing.** Either:
   - (a) Create the GitHub repo `lightningconnect/lightningconnect` and push the `lightningconnect/` folder to it, **or**
   - (b) Update `lightningconnect/package.json` to point `repository.url`, `bugs.url`, and `homepage` at the real repository you intend to use. Drop the `"directory": "lightningconnect"` field if the repo root IS the package.

3. **Smoke-test post-publish from a clean folder** (not the package folder):
   ```bash
   mkdir /tmp/lc-test && cd /tmp/lc-test
   npm init -y && npm install lightningconnect react react-dom
   node -e "const m=require('lightningconnect'); console.log(Object.keys(m))"
   ```
   The output must include `watchPayment`. If it does, the v1.0.0 API is live and integrators will get the README behavior.

## Technical notes

- The Lovable codebase itself is fine — `lightningconnect/src/index.ts` correctly exports `watchPayment`, `useWalletConnect` with options, and the updated `LightningConnect` props. `vite.lib.config.ts` and `prepublishOnly` will bundle them correctly. The mismatch only exists between the README and the **published** tarball, because the publish never succeeded.
- No edits inside Lovable are required to unblock integration. The fixes are: (1) republish from your machine, (2) point the repo URL at a real GitHub repo. Step 2 is the only one I'd change in this project's files.
