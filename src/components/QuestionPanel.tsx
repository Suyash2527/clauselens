"use client";

import { useState } from "react";
import { NETWORK_ERROR_MESSAGE, readErrorMessage } from "@/lib/errors";
import type { AnalyzedClause, AskAnswer, Perspective } from "@/lib/types";

interface QuestionPanelProps {
  clauses: AnalyzedClause[];
  perspective: Perspective;
}

/**
 * Follow-up questions grounded in the analysed clauses. Only id, index and
 * text are sent back, so the model answers from the document, not from its
 * own earlier summaries.
 */
export function QuestionPanel({ clauses, perspective }: QuestionPanelProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AskAnswer | null>(null);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    setAsking(true);
    setError(null);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          perspective,
          clauses: clauses.map((c) => ({ id: c.id, index: c.index, text: c.text })),
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        setError(readErrorMessage(body, "Something went wrong."));
        return;
      }
      setAnswer(body as AskAnswer);
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
    } finally {
      setAsking(false);
    }
  }

  return (
    <section className="panel" aria-labelledby="ask-heading">
      <h2 id="ask-heading">Ask about this document</h2>
      <label className="label" htmlFor="question">
        Your question
      </label>
      <input
        id="question"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="When can this agreement be ended early?"
        style={{ width: "100%", padding: "0.7rem", margin: "0.5rem 0 0.75rem" }}
      />
      <button
        className="button"
        type="button"
        onClick={ask}
        disabled={asking || question.trim().length < 3}
      >
        {asking ? "Checking the document…" : "Ask"}
      </button>

      <div role="status" aria-live="polite" style={{ marginTop: "1rem" }}>
        {error && <p style={{ color: "var(--oxblood)" }}>{error}</p>}
        {answer && (
          <>
            <p>{answer.answer}</p>
            {answer.citedClauseIds.length > 0 && (
              <p className="label">
                Based on clause{answer.citedClauseIds.length > 1 ? "s" : ""}{" "}
                {answer.citedClauseIds.map((id) => id.replace("c", "")).join(", ")}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
