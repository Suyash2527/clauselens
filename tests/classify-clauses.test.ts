import { describe, expect, it, vi } from "vitest";
import { classifyClauses } from "@/lib/gemini/classify-clauses";
import * as client from "@/lib/gemini/client";
import { ClauseChunk } from "@/lib/types";

vi.mock("@/lib/gemini/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/gemini/client")>();
  return {
    ...actual,
    generateStructured: vi.fn(),
  };
});

describe("classifyClauses batch builder", () => {
  it("respects the count limit of 20 clauses", async () => {
    const chunks: ClauseChunk[] = Array.from({ length: 45 }, (_, i) => ({
      id: `c${i}`,
      text: "This is a short clause.",
      index: i, startOffset: 0, endOffset: 12
    }));

    vi.mocked(client.generateStructured).mockResolvedValue({
      clauses: [] // Return empty to just check batches
    });

    await classifyClauses(chunks, "tenant");

    // 45 chunks -> 20 + 20 + 5
    expect(client.generateStructured).toHaveBeenCalledTimes(3);
    
    // Check batch sizes
    const call1 = vi.mocked(client.generateStructured).mock.calls[0]?.[0]?.contents;
    expect(call1).toContain("c0"); // rough check
    expect(vi.mocked(client.generateStructured).mock.calls[0]?.[0]?.contents).toMatch(/c19/);
  });

  it("respects the token limit of 8000 (~32000 chars)", async () => {
    // 32000 chars per clause -> each should be its own batch
    const chunks: ClauseChunk[] = Array.from({ length: 3 }, (_, i) => ({
      id: `c${i}`,
      text: "A".repeat(32000), // ~8000 tokens
      index: i, startOffset: 0, endOffset: 32000
    }));

    vi.mocked(client.generateStructured).mockClear();
    vi.mocked(client.generateStructured).mockResolvedValue({
      clauses: []
    });

    await classifyClauses(chunks, "tenant");

    // Each clause exceeds the batch limit on its own (or rather, the next one won't fit)
    expect(client.generateStructured).toHaveBeenCalledTimes(3);
  });

  it("preserves order by index in the merged result", async () => {
    const chunks: ClauseChunk[] = [
      { id: "a", text: "chunk a.", index: 0, startOffset: 0, endOffset: 8 },
      { id: "b", text: "chunk b.", index: 1, startOffset: 0, endOffset: 8 },
      { id: "c", text: "chunk c.", index: 2, startOffset: 0, endOffset: 8 },
    ];

    vi.mocked(client.generateStructured).mockClear();
    // Mock Gemini returning them out of order
    vi.mocked(client.generateStructured).mockResolvedValueOnce({
      clauses: [
        { id: "c", severity: "high", explanation: "c", perspective: "tenant", redFlags: [] },
        { id: "b", severity: "low", explanation: "b", perspective: "tenant", redFlags: [] },
        { id: "a", severity: "medium", explanation: "a", perspective: "tenant", redFlags: [] },
      ]
    });

    const result = await classifyClauses(chunks, "tenant");

    // Map keys should be in insertion order, which matches original chunks
    const keys = Array.from(result.keys());
    expect(keys).toEqual(["a", "b", "c"]);
  });
});
