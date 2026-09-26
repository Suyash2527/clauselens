"use client";

import { useEffect, useRef } from "react";

interface Props {
  text: string;
  setText: (text: string) => void;
  pendingUpload: File | null;
  extractedFile: { name: string; size: number } | null;
  extractedCount: number | null;
  extracting: boolean;
  pending: boolean;
  error: string | null;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCancelUpload: () => void;
  onConfirmUpload: (file: File) => void;
}

export function DocumentInput({
  text,
  setText,
  pendingUpload,
  extractedFile,
  extractedCount,
  extracting,
  pending,
  error,
  onFileChange,
  onCancelUpload,
  onConfirmUpload,
}: Props) {
  const confirmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pendingUpload && confirmRef.current) {
      confirmRef.current.focus();
    }
  }, [pendingUpload]);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "1.5rem" }}>
        <label className="label" htmlFor="document">
          Paste the agreement text
        </label>
        <label 
          id="document-upload-label"
          htmlFor="document-upload" 
          className="button button--secondary" 
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
          onChange={onFileChange}
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

      <div role="status" aria-live="polite" style={{ marginTop: "1rem" }}>
        {pendingUpload && (
          <div style={{ padding: "1rem", border: "1px solid var(--ink-soft)", borderRadius: "4px", marginBottom: "1rem" }} tabIndex={-1} ref={confirmRef}>
            <p>Uploading will replace your current text. Are you sure?</p>
            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <button className="button" type="button" onClick={() => onConfirmUpload(pendingUpload)} suppressHydrationWarning>Replace existing text</button>
              <button className="button button--secondary" type="button" onClick={onCancelUpload} suppressHydrationWarning>Cancel</button>
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
    </>
  );
}
