import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [
    react(),
    dts({ insertTypesEntry: true, rollupTypes: true, include: ["src"] }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "LightningConnect",
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.esm.js" : "index.cjs.js"),
    },
    outDir: "dist",
    sourcemap: true,
    emptyOutDir: true,
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "react/jsx-runtime": "jsxRuntime",
        },
      },
    },
  },
});
