import { useEffect, useRef } from "react";
import type { DocumentAnalysis } from "@/lib/types";
import { ClauseCard } from "./ClauseCard";
import { QuestionPanel } from "./QuestionPanel";

export function ResultsView({ analysis }: { analysis: DocumentAnalysis }) {
  const { clauses, redFlags, lawyerChecklist, truncated } = analysis;
  
  const highCount = clauses.filter(c => c.severity === "high").length;
  const mediumCount = clauses.filter(c => c.severity === "medium").length;
  const lowCount = clauses.filter(c => c.severity === "low").length;

  const headerRef = useRef<HTMLHeadingElement>(null);
  
  useEffect(() => {
    headerRef.current?.focus();
  }, []);

  return (
    <>
      <section aria-labelledby="summary-heading" className="step-header" style={{ marginTop: "2rem" }}>
        <span className="step-indicator">Step 3 of 3</span>
        <h2 id="summary-heading" tabIndex={-1} ref={headerRef} style={{ outline: 'none' }}>
          {redFlags.length === 0 
            ? "No clauses need your immediate attention." 
            : `${redFlags.length} clause${redFlags.length > 1 ? "s" : ""} need${redFlags.length === 1 ? "s" : ""} your attention before you sign.`}
        </h2>
        
        {truncated && <p style={{ marginTop: "0.5rem" }}>Only the first 60 clauses were analysed.</p>}

        <div className="summary-stats" aria-label={`Summary: ${highCount} needs attention, ${mediumCount} worth reading, ${lowCount} routine`}>
          <div className="stat-box stat-box--high animate-in delay-100" aria-hidden="true">
            <span className="stat-box-count">{highCount}</span>
            <span className="stat-box-label">Needs attention</span>
          </div>
          <div className="stat-box stat-box--medium animate-in delay-200" aria-hidden="true">
            <span className="stat-box-count">{mediumCount}</span>
            <span className="stat-box-label">Worth reading</span>
          </div>
          <div className="stat-box stat-box--low animate-in delay-300" aria-hidden="true">
            <span className="stat-box-count">{lowCount}</span>
            <span className="stat-box-label">Routine</span>
          </div>
        </div>
      </section>

      {redFlags.length > 0 && (
        <section aria-labelledby="redflags-heading">
          <h3 id="redflags-heading" className="label" style={{ marginBottom: "1.5rem" }}>Needs attention</h3>
          {redFlags.map((clause) => (
            <ClauseCard key={`redflag-${clause.id}`} clause={clause} />
          ))}
        </section>
      )}

      {lawyerChecklist.length > 0 && (
        <section className="panel" aria-labelledby="checklist-heading" style={{ marginBottom: "2rem" }}>
          <h3 id="checklist-heading" style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Questions to take to a lawyer</h3>
          <ol>
            {lawyerChecklist.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ol>
        </section>
      )}

      <section aria-labelledby="clauses-heading">
        <details>
          <summary id="clauses-heading">See all {clauses.length} clauses</summary>
          <div style={{ marginTop: "1.5rem" }}>
            {clauses.map((clause) => (
              <ClauseCard key={clause.id} clause={clause} />
            ))}
          </div>
        </details>
      </section>

      <div style={{ marginTop: "2rem" }}>
        <QuestionPanel clauses={clauses} perspective={analysis.perspective} />
      </div>
    </>
  );
}
