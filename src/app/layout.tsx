import type { Metadata } from "next";
import "./globals.css";

/** Page title and description used by browsers and link previews. */
export const metadata: Metadata = {
  title: "ClauseLens — understand what you are about to sign",
  description:
    "Clause-by-clause plain-language explanations of rental, employment and freelance agreements, scored from your side of the deal.",
};

/**
 * Root shell. The demo-mode banner is rendered on the server, where the key is
 * visible, so the browser only learns whether a key exists, never its value.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Newsreader:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        {!process.env.GEMINI_API_KEY && (
          <div style={{ background: "var(--amber)", color: "#000", padding: "0.5rem", textAlign: "center", fontWeight: 500, fontSize: "0.9rem" }}>
            Demo mode — showing sample analysis. Add a Gemini API key for live results.
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
