import mammoth from "mammoth";
import { describe, expect, it, vi } from "vitest";
import { extractDocxText } from "@/lib/extract/docx";
import { extractPdfText } from "@/lib/gemini/extract-text";
import * as client from "@/lib/gemini/client";
import fs from "fs";

vi.mock("mammoth", () => ({
  default: {
    extractRawText: vi.fn(),
  },
}));

vi.mock("@/lib/gemini/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/gemini/client")>();
  return {
    ...actual,
    generateStructured: vi.fn(),
  };
});

describe("extractPdfText", () => {
  it("extracts text-based PDF locally without calling Gemini", async () => {
    const buffer = fs.readFileSync("tests/fixtures/lease-text.pdf");
    vi.mocked(client.generateStructured).mockClear();
    
    const result = await extractPdfText(buffer);
    
    expect(result.length).toBeGreaterThanOrEqual(200);
    expect(result).toContain("LEASE AGREEMENT");
    expect(client.generateStructured).not.toHaveBeenCalled();
  });

  it("falls back to Gemini for scanned PDFs with <200 chars", async () => {
    const buffer = fs.readFileSync("tests/fixtures/scanned.pdf");
    vi.mocked(client.generateStructured).mockResolvedValueOnce({ text: "Fallback OCR text" });
    
    const result = await extractPdfText(buffer);
    
    expect(result).toBe("Fallback OCR text");
    expect(client.generateStructured).toHaveBeenCalled();
  });

  it("throws a clean AppError for corrupt PDFs", async () => {
    const buffer = fs.readFileSync("tests/fixtures/corrupt.pdf");
    
    await expect(extractPdfText(buffer)).rejects.toMatchObject({
      message: "The PDF file is corrupt or invalid.",
      status: 400
    });
  });
});

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
