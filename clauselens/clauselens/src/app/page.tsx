"use client";

import { useState } from "react";
import type { DocumentAnalysis, Perspective } from "@/lib/types";
import { Disclaimer } from "@/components/Disclaimer";
import { RoleSelector } from "@/components/RoleSelector";
import { ResultsView } from "@/components/ResultsView";

const MIN_CHARS = 50;

export default function HomePage() {
  const [text, setText] = useState("");
  const [perspective, setPerspective] = useState<Perspective>("tenant");
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    setPending(true);
    setError(null);
    setAnalysis(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, perspective }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        setError(readError(body));
        return;
      }
      setAnalysis(body as DocumentAnalysis);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="shell" id="main">
      <header>
        <p className="label">ClauseLens</p>
        <h1>Understand what you are about to sign.</h1>
        <p style={{ maxWidth: "44rem", color: "var(--ink-soft)" }}>
          Paste a rental, employment, or freelance agreement. Every clause is explained in plain
          English and weighed from your side of the deal, with the original wording one click away.
        </p>
      </header>

      <hr className="rule" />

      <Disclaimer />

      <section aria-labelledby="input-heading" style={{ marginTop: "2rem" }}>
        <h2 id="input-heading">Your document</h2>

        <RoleSelector value={perspective} onChange={setPerspective} disabled={pending} />

        <label className="label" htmlFor="document" style={{ display: "block", marginTop: "1.5rem" }}>
          Paste the agreement text
        </label>
        <textarea
          id="document"
          value={text}
          disabled={pending}
          aria-describedby="document-help"
          onChange={(event) => setText(event.target.value)}
          placeholder="Paste the full text of the agreement here…"
          style={{ marginTop: "0.5rem" }}
        />
        <p id="document-help" className="label">
          {text.length.toLocaleString()} characters · nothing is stored after the page is closed
        </p>

        <button
          className="button"
          type="button"
          onClick={analyze}
          disabled={pending || text.trim().length < MIN_CHARS}
          style={{ marginTop: "1rem" }}
        >
          {pending ? "Reading the document…" : "Explain this document"}
        </button>

        <div role="status" aria-live="polite" style={{ marginTop: "1rem" }}>
          {pending && <p>Splitting the document into clauses and reviewing each one.</p>}
          {error && <p style={{ color: "var(--oxblood)" }}>{error}</p>}
        </div>
      </section>

      {analysis && <ResultsView analysis={analysis} />}
    </main>
  );
}

function readError(body: unknown): string {
  if (typeof body === "object" && body !== null && "error" in body) {
    const { error } = body as { error: unknown };
    if (typeof error === "string") return error;
  }
  return "Something went wrong. Please try again.";
}
