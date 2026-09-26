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
export const dynamic = "force-dynamic";

import { Fraunces, Newsreader, JetBrains_Mono } from "next/font/google";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-display", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-body", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${newsreader.variable} ${mono.variable}`}>
      <head>
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
