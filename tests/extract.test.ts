import mammoth from "mammoth";
import { describe, expect, it, vi } from "vitest";
import { extractDocxText } from "@/lib/extract/docx";

vi.mock("mammoth", () => ({
  default: {
    extractRawText: vi.fn(),
  },
}));

describe("extractDocxText", () => {
  it("extracts and trims text from a valid buffer", async () => {
    vi.mocked(mammoth.extractRawText).mockResolvedValue({
      value: "  This is some extracted text.  \n",
      messages: [],
    });

    const result = await extractDocxText(Buffer.from("dummy"));
    expect(result).toBe("This is some extracted text.");
    expect(mammoth.extractRawText).toHaveBeenCalledWith({ buffer: Buffer.from("dummy") });
  });

  it("returns an empty string for a whitespace-only document", async () => {
    vi.mocked(mammoth.extractRawText).mockResolvedValue({
      value: "   ",
      messages: [],
    });

    const result = await extractDocxText(Buffer.from("dummy"));
    expect(result).toBe("");
  });

  it("propagates the parser error for a corrupt file", async () => {
    vi.mocked(mammoth.extractRawText).mockRejectedValue(new Error("Corrupt docx"));

    await expect(extractDocxText(Buffer.from("bad"))).rejects.toThrow("Corrupt docx");
  });
});
