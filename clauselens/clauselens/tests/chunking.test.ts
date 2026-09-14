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

  it("records offsets that point back into the normalised source", () => {
    const chunks = chunkIntoClauses(LEASE);
    for (const chunk of chunks) {
      expect(chunk.endOffset).toBeGreaterThan(chunk.startOffset);
    }
  });

  it("drops fragments below the minimum clause length", () => {
    expect(chunkIntoClauses("1. OK\n\n2. No.")).toHaveLength(0);
  });

  it("returns an empty array for empty input", () => {
    expect(chunkIntoClauses("   ")).toEqual([]);
  });

  it("splits oversized clauses rather than emitting one enormous chunk", () => {
    const long = `1. ${"This sentence describes an obligation of the tenant. ".repeat(200)}`;
    const chunks = chunkIntoClauses(long);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(chunk.text.length).toBeLessThanOrEqual(4_100);
  });

  it("handles Windows line endings", () => {
    const chunks = chunkIntoClauses("1. RENT\r\nRent is due monthly on the fifth day.\r\n\r\n2. TERM\r\nThe term runs for eleven full months.");
    expect(chunks).toHaveLength(2);
  });
});
