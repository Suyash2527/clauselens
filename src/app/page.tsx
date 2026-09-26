"use client";

import { useEffect, useRef, useState } from "react";
import { DocumentInput, type UploadedFileInfo } from "@/components/DocumentInput";
import { DemoBanner } from "@/components/DemoBanner";
import { Disclaimer } from "@/components/Disclaimer";
import dynamic from "next/dynamic";
const ResultsView = dynamic(() => import("@/components/ResultsView").then(mod => ({ default: mod.ResultsView })), { loading: () => <p aria-busy="true">Loading results…</p> });
import { RoleSelector } from "@/components/RoleSelector";
import { GENERIC_ERROR_MESSAGE, NETWORK_ERROR_MESSAGE, readErrorMessage } from "@/lib/errors";
import type { DocumentAnalysis, Perspective } from "@/lib/types";

/** Mirrors the server-side minimum so the button is disabled before a round trip fails. */
const MIN_CHARS = 50;

/**
 * Three-step flow: pick a role, add a document, read the results. The role is
 * chosen first because every score on the results page depends on it.
 */
export default function HomePage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [text, setText] = useState("");
  const [perspective, setPerspective] = useState<Perspective>("tenant");
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedFile, setExtractedFile] = useState<UploadedFileInfo | null>(null);
  const [extractedCharCount, setExtractedCharCount] = useState<number | null>(null);
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
    // Reset so choosing the same file again still fires a change event.
    event.target.value = "";
    // Never overwrite typed text silently; ask first.
    if (text.trim().length > 0) setPendingUpload(file);
    else void uploadAndExtract(file);
  }

  function cancelUpload() {
    setPendingUpload(null);
    document.getElementById("document-upload-label")?.focus();
  }

  async function uploadAndExtract(file: File) {
    setPendingUpload(null);
    setExtracting(true);
    setError(null);
    setAnalysis(null);
    setExtractedFile({ name: file.name, size: file.size });
    setExtractedCharCount(null);
    setText("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/extract", { method: "POST", body: formData });
      const body: unknown = await response.json();
      if (!response.ok) {
        setError(readErrorMessage(body, GENERIC_ERROR_MESSAGE));
        setExtractedFile(null);
        return;
      }
      const extractedText = (body as { text: string }).text;
      setText(extractedText);
      setExtractedCharCount(extractedText.length);
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
      setExtractedFile(null);
    } finally {
      setExtracting(false);
    }
  }

  async function analyze() {
    setAnalyzing(true);
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
        setError(readErrorMessage(body, GENERIC_ERROR_MESSAGE));
        return;
      }
      setAnalysis(body as DocumentAnalysis);
      setStep(3);
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
    } finally {
      setAnalyzing(false);
    }
  }

  function startOver() {
    setStep(1);
    setAnalysis(null);
    setText("");
  }

  return (
    <>
      <DemoBanner />
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
          <h2 id="step1-heading" tabIndex={-1} ref={step1Ref} style={{ outline: "none" }}>
            Who are you in this agreement?
          </h2>

          <RoleSelector value={perspective} onChange={setPerspective} disabled={analyzing} />

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
          <h2 id="step2-heading" tabIndex={-1} ref={step2Ref} style={{ outline: "none" }}>
            Add your document
          </h2>

          <DocumentInput
            text={text}
            setText={setText}
            pendingUpload={pendingUpload}
            extractedFile={extractedFile}
            extractedCharCount={extractedCharCount}
            extracting={extracting}
            analyzing={analyzing}
            error={error}
            onFileChange={handleFileChange}
            onCancelUpload={cancelUpload}
            onConfirmUpload={uploadAndExtract}
          />

          <div className="button-group">
            <button className="button button--secondary" type="button" onClick={() => setStep(1)} disabled={analyzing || extracting} suppressHydrationWarning>
              Back to role selection
            </button>
            <button
              className="button"
              type="button"
              onClick={analyze}
              disabled={analyzing || extracting || text.trim().length < MIN_CHARS}
              suppressHydrationWarning
            >
              {analyzing ? "Reading the document…" : "Explain this document"}
            </button>
          </div>
        </section>
      )}

      {step === 3 && analysis && (
        <div className="animate-in">
          <ResultsView analysis={analysis} />
          <div className="button-group" style={{ marginTop: "2rem" }}>
            <button className="button button--secondary" type="button" onClick={startOver} suppressHydrationWarning>
              Start over with a new document
            </button>
          </div>
        </div>
      )}
    </main>
    </>
  );
}
