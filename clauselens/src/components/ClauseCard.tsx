"use client";

import { useId, useState } from "react";
import type { AnalyzedClause } from "@/lib/types";
import { RiskBadge } from "./RiskBadge";

const CATEGORY_LABELS: Record<string, string> = {
  auto_renewal: "auto renewal",
  dispute_resolution: "dispute resolution",
  intellectual_property: "intellectual property",
  non_compete: "non compete",
};

function readableCategory(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replace(/_/g, " ");
}

export function ClauseCard({ clause }: { clause: AnalyzedClause }) {
  const [showSource, setShowSource] = useState(false);
  const sourceId = useId();
  const { analysis, severity } = clause;

  return (
    <article className={`clause clause--${severity}`} aria-labelledby={`${sourceId}-heading`}>
      <header style={{ display: "flex", gap: "0.75rem", alignItems: "baseline", flexWrap: "wrap" }}>
        <span className="label">Clause {clause.index}</span>
        <span className="label">{readableCategory(analysis.category)}</span>
        <RiskBadge severity={severity} />
      </header>

      <h3 id={`${sourceId}-heading`} style={{ fontSize: "1.15rem", marginTop: "0.5rem" }}>
        {analysis.plainSummary}
      </h3>

      {analysis.concerns.length > 0 && (
        <>
          <p className="label">What to watch</p>
          <ul>
            {analysis.concerns.map((concern) => (
              <li key={concern}>{concern}</li>
            ))}
          </ul>
        </>
      )}

      <button
        type="button"
        className="button"
        style={{ background: "transparent", color: "var(--ink)", padding: "0.3rem 0.7rem" }}
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
