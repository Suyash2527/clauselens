import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { chunkIntoClauses } from "@/lib/chunking";

const LEASE = `1. TERM
The tenancy shall run for eleven months from the commencement date.

2. RENT
The tenant shall pay rent of INR 25,000 on or before the fifth day of each month.

Late payment shall attract interest at two percent per month until cleared.

3. TERMINATION
Either party may terminate this agreement by giving two months written notice.`;

describe("chunkIntoClauses", () => {
  it("splits a numbered agreement into one chunk per clause", () => {
    const chunks = chunkIntoClauses(LEASE);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]?.text).toContain("eleven months");
  });

  it("merges unnumbered continuation paragraphs into the preceding clause", () => {
    const chunks = chunkIntoClauses(LEASE);
    expect(chunks[1]?.text).toContain("two percent per month");
  });

  it("assigns stable sequential ids and indexes", () => {
    const chunks = chunkIntoClauses(LEASE);
    expect(chunks.map((c) => c.id)).toEqual(["c1", "c2", "c3"]);
    expect(chunks.map((c) => c.index)).toEqual([1, 2, 3]);
  });

  it("records a non-empty offset span for every chunk", () => {
    const chunks = chunkIntoClauses(LEASE);
    for (const chunk of chunks) {
      expect(chunk.endOffset).toBeGreaterThan(chunk.startOffset);
    }
  });

  it("drops fragments below the minimum clause length", () => {
    expect(chunkIntoClauses("1. OK\n\n2. No.")).toHaveLength(0);
  });

  it("returns an empty array for whitespace-only input", () => {
    expect(chunkIntoClauses("   ")).toEqual([]);
  });

  it("splits oversized clauses rather than emitting one enormous chunk", () => {
    const long = `1. ${"This sentence describes an obligation of the tenant. ".repeat(200)}`;
    const chunks = chunkIntoClauses(long);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(chunk.text.length).toBeLessThanOrEqual(4_100);
  });

  it("splits employment-agreement.txt, whose clauses have no blank lines between them", () => {
    const raw = readFileSync(fileURLToPath(new URL(`./fixtures/employment-agreement.txt`, import.meta.url)), "utf8");
    const chunks = chunkIntoClauses(raw);
    expect(chunks).toHaveLength(7);
    expect(chunks[0]?.text.startsWith("1. POSITION AND DUTIES")).toBe(true);
    expect(chunks[6]?.text.startsWith("7. GOVERNING LAW")).toBe(true);
  });

  it("splits freelance-agreement.txt, whose clauses have no blank lines between them", () => {
    const raw = readFileSync(fileURLToPath(new URL(`./fixtures/freelance-agreement.txt`, import.meta.url)), "utf8");
    const chunks = chunkIntoClauses(raw);
    expect(chunks).toHaveLength(9);
    expect(chunks[0]?.text.startsWith("1. REVISIONS")).toBe(true);
    expect(chunks[8]?.text.startsWith("9. FIXED FEE")).toBe(true);
  });

  it("splits consecutive 'Section N' lines", () => {
    const text = "Section 1. RENT: Rent is due monthly on the fifth day.\nSection 2. TERM: The term runs for eleven full months.";
    expect(chunkIntoClauses(text)).toHaveLength(2);
  });

  it("keeps sub-numbered lines with their parent clause", () => {
    const text = [
      "1. PAYMENT: The client shall pay the fees set out below.",
      "1.1 Fees are payable within thirty days of each invoice.",
      "(a) Late fees accrue at two percent per month on unpaid sums.",
      "2. TERM: This agreement runs for twelve months from signing.",
    ].join("\n");
    const chunks = chunkIntoClauses(text);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]?.text).toContain("Late fees accrue");
  });

  it("does not split on a wrapped line that begins with an out-of-sequence number", () => {
    const text = "1. PAYMENT: Invoices are payable on receipt and in any case within\n30. days of the date shown on the invoice itself.";
    expect(chunkIntoClauses(text)).toHaveLength(1);
  });

  it("keeps chunk offsets pointing at the chunk's own text", () => {
    const raw = readFileSync(fileURLToPath(new URL("./fixtures/employment-agreement.txt", import.meta.url)), "utf8");
    const normalised = raw.replace(/\r\n?/g, "\n");
    for (const chunk of chunkIntoClauses(raw)) {
      expect(normalised.slice(chunk.startOffset, chunk.endOffset).trim()).toBe(chunk.text);
    }
  });

  it("splits CRLF-delimited text into clauses like LF text", () => {
    const chunks = chunkIntoClauses("1. RENT\r\nRent is due monthly on the fifth day.\r\n\r\n2. TERM\r\nThe term runs for eleven full months.");
    expect(chunks).toHaveLength(2);
  });
});
