"use client";

import { useId, useState } from "react";
import type { AnalyzedClause, ClauseCategory } from "@/lib/types";
import { RiskBadge } from "./RiskBadge";

function readableCategory(category: ClauseCategory): string {
  return category.replace(/_/g, " ");
}

/**
 * One analysed clause. The plain-language summary leads; the original wording
 * is one click away so the user can check the summary against the source.
 */
export function ClauseCard({ clause }: { clause: AnalyzedClause }) {
  const [showSource, setShowSource] = useState(false);
  const sourceId = useId();
  const { analysis, severity } = clause;

  return (
    <article className={`clause clause--${severity}`} aria-labelledby={`${sourceId}-heading`}>
      <header style={{ display: "flex", gap: "0.75rem", alignItems: "baseline", flexWrap: "wrap", marginBottom: "0.5rem" }}>
        <RiskBadge severity={severity} />
        <span className="label">Clause {clause.index} &bull; {readableCategory(analysis.category)}</span>
      </header>

      <h3 id={`${sourceId}-heading`} style={{ fontSize: "1.25rem", margin: "0.5rem 0 1rem" }}>
        {analysis.plainSummary}
      </h3>

      {analysis.concerns.length > 0 && (
        <>
          <p className="label">What to watch</p>
          <ul style={{ marginTop: "0.5rem", marginBottom: "1rem" }}>
            {analysis.concerns.map((concern) => (
              <li key={concern}>{concern}</li>
            ))}
          </ul>
        </>
      )}

      <button
        type="button"
        className="button"
        style={{ background: "transparent", color: "var(--ink)", padding: "0.3rem 0.7rem", marginTop: "0.5rem", border: "1px solid var(--rule)" }}
        aria-expanded={showSource}
        aria-controls={sourceId}
        onClick={() => setShowSource((open) => !open)}
      >
        {showSource ? "Hide original text" : "Show original text"}
      </button>

      {showSource && (
        <p className="clause__source" id={sourceId}>
          {clause.text}
        </p>
      )}
    </article>
  );
}
