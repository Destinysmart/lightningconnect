## Current state

The `lightningconnect/` subfolder already exists with library-only code:
- `lightningconnect/package.json` — name `lightningconnect`, exports configured, currently builds via **tsup** (`tsup src/index.ts --format esm,cjs --dts --minify`).
- `lightningconnect/src/index.ts` — already exports `LightningConnect`, `useWalletConnect`, storage helpers, and all public types.
- `lightningconnect/src/` — widget, hooks, connectors (blink-address, nwc, blink-api), storage. No demo app code is mixed in.
- `lightningconnect/README.md`.

Missing vs your spec:
- No `lightningconnect/tsconfig.json` (the lib currently rides on the root `tsconfig.json`).
- No `lightningconnect/vite.lib.config.ts` (build uses tsup, not Vite library mode).
- `main` / `module` field names use `.cjs` / `.js`, you asked for `.cjs.js` / `.esm.js`.

The root demo app (TanStack Start in `src/`) stays untouched.

## Plan

### 1. Switch build tool from tsup to Vite library mode

Create `lightningconnect/vite.lib.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react(), dts({ insertTypesEntry: true, rollupTypes: true })],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "LightningConnect",
      formats: ["es", "cjs"],
      fileName: (format) => format === "es" ? "index.esm.js" : "index.cjs.js",
    },
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: { globals: { react: "React", "react-dom": "ReactDOM" } },
    },
  },
});
```

Bundled deps (`nostr-tools`, `@noble/hashes`, `qrcode`, `zustand`, `lucide-react`) stay inlined so consumers only need React as a peer.

### 2. Update `lightningconnect/package.json`

- `main`: `dist/index.cjs.js`
- `module`: `dist/index.esm.js`
- `types`: `dist/index.d.ts`
- `files`: `["dist", "README.md"]`
- `exports`: update `import` → `./dist/index.esm.js`, `require` → `./dist/index.cjs.js`
- `scripts.build`: `vite build --config vite.lib.config.ts`
- `scripts.dev`: `vite build --config vite.lib.config.ts --watch`
- Add devDeps: `vite`, `@vitejs/plugin-react`, `vite-plugin-dts` (kept local to the lib's publish manifest — they can be installed at the root for dev too).

### 3. Create `lightningconnect/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationDir": "dist",
    "outDir": "dist",
    "isolatedModules": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["src"]
}
```

Root `tsconfig.json` stays scoped to the demo app via its existing `include`, so the two don't collide.

### 4. Verification

From the project root: `cd lightningconnect && bun install && bun run build`, then inspect `lightningconnect/dist/` for `index.esm.js`, `index.cjs.js`, `index.d.ts`. Confirm `react` is external in the output.

## On your repo question

I can only see this Lovable workspace, not your GitHub remote. In this workspace the `lightningconnect/` subfolder **does** already exist (created in earlier turns). Once GitHub sync runs, it will be there too — you can then clone the repo, `cd lightningconnect`, `npm publish`.

## Out of scope

- No changes to the root demo app, its `vite.config.ts`, or `package.json`.
- No npm publish from here — you publish from your clone.
- No changes to library source (`widget.tsx`, connectors, hooks).
