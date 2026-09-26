const PATTERNS: ReadonlyArray<[RegExp, string]> = [
  [/\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b/g, "[AADHAAR]"],
  [/\b[A-Z]{5}\d{4}[A-Z]\b/g, "[PAN]"],
  [/\b[A-Z]{4}0[A-Z0-9]{6}\b/g, "[IFSC]"],
  [/(?:\+91[\s-]?)?\b[6-9]\d{9}\b/g, "[PHONE]"],
  [/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[EMAIL]"],
  [/\b\d{9,18}\b/g, "[ACCOUNT]"],
];

/** Replaces Indian personal identifiers with placeholders before text leaves the server. */
export function maskPii(text: string): { text: string; masked: number } {
  let masked = 0;
  let out = text;
  for (const [re, label] of PATTERNS) {
    out = out.replace(re, () => { masked += 1; return label; });
  }
  return { text: out, masked };
}
