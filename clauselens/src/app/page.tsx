"use client";

import { useState, useRef, useEffect } from "react";
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
  const [extracting, setExtracting] = useState(false);
  const [extractedFile, setExtractedFile] = useState<{name: string, size: number} | null>(null);
  const [extractedCount, setExtractedCount] = useState<number | null>(null);

  const [pendingUpload, setPendingUpload] = useState<File | null>(null);
  const confirmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pendingUpload && confirmRef.current) {
      confirmRef.current.focus();
    }
  }, [pendingUpload]);

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

        <RoleSelector value={perspective} onChange={setPerspective} disabled={pending || extracting} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "1.5rem" }}>
          <label className="label" htmlFor="document">
            Paste the agreement text
          </label>
          <label 
            id="document-upload-label"
            htmlFor="document-upload" 
            className="button" 
            tabIndex={0}
            onKeyDown={(e) => { 
              if (e.key === "Enter" || e.key === " ") { 
                e.preventDefault(); 
                document.getElementById("document-upload")?.click(); 
              } 
            }}
            style={{ fontSize: "0.875rem", padding: "0.25rem 0.75rem", cursor: "pointer", opacity: (pending || extracting) ? 0.5 : 1 }}>
            Upload PDF or DOCX
          </label>
          <input
            type="file"
            id="document-upload"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            style={{ display: "none" }}
            onChange={handleFileChange}
            disabled={pending || extracting}
          />
        </div>
        <textarea
          id="document"
          value={text}
          disabled={pending || extracting}
          aria-describedby="document-help"
          onChange={(event) => setText(event.target.value)}
          placeholder="Paste the full text of the agreement here…"
          style={{ marginTop: "0.5rem" }}
        />
        <div id="document-help" className="label" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>{text.length.toLocaleString()} characters · nothing is stored after the page is closed</span>
          {extractedFile && (
            <span>
              {extractedFile.name} ({Math.round(extractedFile.size / 1024)} KB)
            </span>
          )}
        </div>

        <button
          className="button"
          type="button"
          onClick={analyze}
          disabled={pending || extracting || text.trim().length < MIN_CHARS}
          style={{ marginTop: "1rem" }}
        >
          {pending ? "Reading the document…" : "Explain this document"}
        </button>

        <div role="status" aria-live="polite" style={{ marginTop: "1rem" }}>
          {pendingUpload && (
            <div style={{ padding: "1rem", border: "1px solid var(--ink-soft)", borderRadius: "4px", marginBottom: "1rem" }} tabIndex={-1} ref={confirmRef}>
              <p>Uploading will replace your current text. Are you sure?</p>
              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button className="button" type="button" onClick={() => performUpload(pendingUpload)}>Replace existing text</button>
                <button className="button" type="button" onClick={cancelUpload}>Cancel</button>
              </div>
            </div>
          )}
          {extracting && <p>Extracting text from document...</p>}
          {pending && <p>Splitting the document into clauses and reviewing each one.</p>}
          {extractedCount !== null && !pending && !extracting && !error && (
            <p>Extracted {extractedCount.toLocaleString()} characters from {extractedFile?.name}.</p>
          )}
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
