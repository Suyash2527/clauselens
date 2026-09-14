"use client";

import { useState } from "react";
import type { AnalyzedClause, AskAnswer, Perspective } from "@/lib/types";

interface Props {
  clauses: AnalyzedClause[];
  perspective: Perspective;
}

export function QuestionPanel({ clauses, perspective }: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AskAnswer | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    setPending(true);
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
        setError(readError(body));
        return;
      }
      setAnswer(body as AskAnswer);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
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
        disabled={pending || question.trim().length < 3}
      >
        {pending ? "Checking the document…" : "Ask"}
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

function readError(body: unknown): string {
  if (typeof body === "object" && body !== null && "error" in body) {
    const { error } = body as { error: unknown };
    if (typeof error === "string") return error;
  }
  return "Something went wrong.";
}
