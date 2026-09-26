"use client";

import { useState, useRef, useEffect } from "react";
import type { DocumentAnalysis, Perspective } from "@/lib/types";
import { Disclaimer } from "@/components/Disclaimer";
import { RoleSelector } from "@/components/RoleSelector";
import { ResultsView } from "@/components/ResultsView";
import { DocumentInput } from "@/components/DocumentInput";

const MIN_CHARS = 50;

export default function HomePage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [text, setText] = useState("");
  const [perspective, setPerspective] = useState<Perspective>("tenant");
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedFile, setExtractedFile] = useState<{name: string, size: number} | null>(null);
  const [extractedCount, setExtractedCount] = useState<number | null>(null);
  const [pendingUpload, setPendingUpload] = useState<File | null>(null);

  const step1Ref = useRef<HTMLHeadingElement>(null);
  const step2Ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (step === 1) step1Ref.current?.focus();
    if (step === 2) step2Ref.current?.focus();
    // Step 3 focus is handled inside ResultsView
  }, [step]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (text.trim().length > 0) {
      setPendingUpload(file);
      event.target.value = "";
      return;
    }
    
    performUpload(file);
    event.target.value = "";
  }

  function cancelUpload() {
    setPendingUpload(null);
    document.getElementById("document-upload-label")?.focus();
  }

  async function performUpload(file: File) {
    setPendingUpload(null);

    setExtracting(true);
    setError(null);
    setAnalysis(null);
    setExtractedFile({ name: file.name, size: file.size });
    setExtractedCount(null);
    setText("");
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });
      
      const body: unknown = await response.json();
      if (!response.ok) {
        setError(readError(body));
        setExtractedFile(null);
        return;
      }
      
      const extractedText = (body as { text: string }).text;
      setText(extractedText);
      setExtractedCount(extractedText.length);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setExtractedFile(null);
    } finally {
      setExtracting(false);
    }
  }

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
      setStep(3);
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
          Paste a rental, employment, or freelance agreement. We'll explain each clause in plain English and point out risks based on your role.
        </p>
      </header>

      <hr className="rule" />

      <Disclaimer />

      {step === 1 && (
        <section aria-labelledby="step1-heading" className="step-header animate-in" style={{ marginTop: "2rem" }}>
          <span className="step-indicator">Step 1 of 3</span>
          <h2 id="step1-heading" tabIndex={-1} ref={step1Ref} style={{ outline: 'none' }}>
            Who are you in this agreement?
          </h2>

          <RoleSelector value={perspective} onChange={setPerspective} disabled={false} />

          <div className="button-group">
            <button className="button" type="button" onClick={() => setStep(2)} suppressHydrationWarning>
              Next: Add your document
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section aria-labelledby="step2-heading" className="step-header animate-in" style={{ marginTop: "2rem" }}>
          <span className="step-indicator">Step 2 of 3</span>
          <h2 id="step2-heading" tabIndex={-1} ref={step2Ref} style={{ outline: 'none' }}>
            Add your document
          </h2>

          <DocumentInput
            text={text}
            setText={setText}
            pendingUpload={pendingUpload}
            extractedFile={extractedFile}
            extractedCount={extractedCount}
            extracting={extracting}
            pending={pending}
            error={error}
            onFileChange={handleFileChange}
            onCancelUpload={cancelUpload}
            onConfirmUpload={performUpload}
          />

          <div className="button-group">
            <button className="button button--secondary" type="button" onClick={() => setStep(1)} disabled={pending || extracting} suppressHydrationWarning>
              Back to role selection
            </button>
            <button
              className="button"
              type="button"
              onClick={analyze}
              disabled={pending || extracting || text.trim().length < MIN_CHARS}
              suppressHydrationWarning
            >
              {pending ? "Reading the document…" : "Explain this document"}
            </button>
          </div>
        </section>
      )}

      {step === 3 && analysis && (
        <div className="animate-in">
          <ResultsView analysis={analysis} />
          <div className="button-group" style={{ marginTop: "2rem" }}>
            <button className="button button--secondary" type="button" onClick={() => { setStep(1); setAnalysis(null); setText(""); }} suppressHydrationWarning>
              Start over with a new document
            </button>
          </div>
        </div>
      )}
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
