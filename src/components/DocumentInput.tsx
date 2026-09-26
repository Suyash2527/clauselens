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

const SAMPLE_TEXT = `RENTAL AGREEMENT

This Rental Agreement is made on this 1st day of January 2026, between Mr. Sharma (hereinafter referred to as "Landlord") and Mr. Patel (hereinafter referred to as "Tenant").

Section 1. RENT: The Tenant shall pay a monthly rent of Rs. 25,000 to the Landlord on or before the 5th of every month.

Section 2. SECURITY DEPOSIT: The Tenant shall pay an interest-free security deposit of Rs. 1,00,000, which will be refunded at the time of vacating the premises, subject to deductions for damages or unpaid dues.

Section 3. MAINTENANCE: The Tenant shall bear the monthly maintenance charges of the society. Any major structural repairs shall be the responsibility of the Landlord, while minor electrical or plumbing repairs up to Rs. 1,000 shall be borne by the Tenant.

Section 4. LOCK-IN PERIOD: Both parties agree to a lock-in period of 6 months. If the Tenant vacates before 6 months, the Tenant must pay rent for the remainder of the lock-in period.

Section 5. NOTICE PERIOD: After the lock-in period, either party may terminate this agreement by giving two (2) months' written notice. 

Section 6. LATE PAYMENT PENALTY: A penalty of Rs. 500 per day will be levied for any delay in rent payment beyond the 5th of the month. 

Section 7. SUBLETTING: The Tenant shall not sublet, assign, or part with the possession of the premises, wholly or partly, to any third party under any circumstances.

Section 8. TERMINATION: The Landlord reserves the right to terminate this agreement immediately and evict the Tenant if the rent is not paid for two consecutive months or if the premises are used for any illegal activities.

Section 9. FORFEITURE OF DEPOSIT: If the Tenant breaches any terms of this agreement, the Landlord shall have the right to forfeit the entire security deposit.

Section 10. RENEWAL: This agreement is valid for 11 months. It may be renewed by mutual consent with a 10% escalation in the monthly rent.

Section 11. INDEMNITY: The Tenant agrees to indemnify and hold the Landlord harmless against any claims, damages, or liabilities arising out of the Tenant's use of the property.

Section 12. INSPECTION: The Landlord shall have the right to enter and inspect the premises at reasonable hours with 24 hours prior notice to the Tenant.
`;

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

      <div style={{ marginTop: "1.5rem" }}>
        <button
          className="button button--secondary"
          type="button"
          onClick={() => setText(SAMPLE_TEXT)}
          disabled={pending || extracting}
          suppressHydrationWarning
        >
          Try a sample document
        </button>
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
