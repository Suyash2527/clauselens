import type { DocumentAnalysis } from "@/lib/types";
import { ClauseCard } from "./ClauseCard";
import { QuestionPanel } from "./QuestionPanel";

export function ResultsView({ analysis }: { analysis: DocumentAnalysis }) {
  const { clauses, redFlags, lawyerChecklist, truncated } = analysis;

  return (
    <>
      <hr className="rule" />

      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading">What we found</h2>
        <p>
          {clauses.length} clauses read. {redFlags.length} need your attention before you sign.
          {truncated && " Only the first 60 clauses were analysed."}
        </p>
      </section>

      {lawyerChecklist.length > 0 && (
        <section className="panel" aria-labelledby="checklist-heading">
          <h2 id="checklist-heading">Questions to take to a lawyer</h2>
          <ol>
            {lawyerChecklist.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ol>
        </section>
      )}

      <hr className="rule" />

      <section aria-labelledby="clauses-heading">
        <h2 id="clauses-heading">Clause by clause</h2>
        {clauses.map((clause) => (
          <ClauseCard key={clause.id} clause={clause} />
        ))}
      </section>

      <QuestionPanel clauses={clauses} perspective={analysis.perspective} />
    </>
  );
}
