import { createFileRoute, Link } from "@tanstack/react-router";
import { marked } from "marked";
import readmeSrc from "../../lightningconnect/README.md?raw";

export const Route = createFileRoute("/readme")({
  component: ReadmePage,
  head: () => ({
    meta: [
      { title: "LightningConnect — README" },
      {
        name: "description",
        content:
          "Documentation for LightningConnect, a zero-friction Bitcoin wallet connection widget.",
      },
    ],
  }),
});

const COLORS = {
  bg: "#0A0A0A",
  panel: "#111111",
  fg: "#F5F5F5",
  muted: "#A1A1AA",
  border: "#262626",
  primary: "#F7931A",
};

function ReadmePage() {
  const html = marked.parse(readmeSrc, { async: false }) as string;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        color: COLORS.fg,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <style>{`
        .lc-readme h1 { font-size: 40px; letter-spacing: -0.02em; margin: 32px 0 16px; font-weight: 700; }
        .lc-readme h2 { font-size: 22px; margin: 36px 0 12px; font-weight: 600; border-top: 1px solid ${COLORS.border}; padding-top: 28px; }
        .lc-readme h3 { font-size: 17px; margin: 24px 0 10px; font-weight: 600; }
        .lc-readme p { color: ${COLORS.muted}; line-height: 1.65; margin: 12px 0; }
        .lc-readme a { color: ${COLORS.primary}; text-decoration: none; }
        .lc-readme a:hover { text-decoration: underline; }
        .lc-readme ul { color: ${COLORS.muted}; line-height: 1.7; padding-left: 22px; }
        .lc-readme strong { color: ${COLORS.fg}; }
        .lc-readme code { background: #000; color: ${COLORS.primary}; padding: 2px 6px; border-radius: 4px; font-size: 13px; font-family: ui-monospace, monospace; }
        .lc-readme pre { background: #000; border: 1px solid ${COLORS.border}; border-radius: 10px; padding: 16px; overflow-x: auto; margin: 16px 0; }
        .lc-readme pre code { background: transparent; color: ${COLORS.fg}; padding: 0; font-size: 13px; line-height: 1.55; }
        .lc-readme blockquote { border-left: 3px solid ${COLORS.primary}; padding-left: 14px; color: ${COLORS.muted}; margin: 16px 0; }
        .lc-readme hr { border: none; border-top: 1px solid ${COLORS.border}; margin: 32px 0; }
      `}</style>
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 120px" }}>
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: COLORS.muted,
            textDecoration: "none",
            padding: "6px 12px",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 999,
            marginBottom: 8,
          }}
        >
          ← Back to demo
        </Link>
        <article
          className="lc-readme"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </main>
    </div>
  );
}
