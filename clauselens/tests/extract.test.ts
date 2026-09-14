import { describe, it, expect, vi } from "vitest";
import { extractDocxText } from "../src/lib/extract/docx";
import mammoth from "mammoth";

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

  it("handles empty document correctly", async () => {
    vi.mocked(mammoth.extractRawText).mockResolvedValue({
      value: "   ",
      messages: [],
    });

    const result = await extractDocxText(Buffer.from("dummy"));
    expect(result).toBe("");
  });

  it("throws when mammoth fails (corrupt file)", async () => {
    vi.mocked(mammoth.extractRawText).mockRejectedValue(new Error("Corrupt docx"));

    await expect(extractDocxText(Buffer.from("bad"))).rejects.toThrow("Corrupt docx");
  });
});
