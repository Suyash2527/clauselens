import { describe, expect, it, vi, beforeEach } from "vitest";
import { generateStructured } from "@/lib/gemini/client";
import { z } from "zod";
import { Type } from "@google/genai";

const mockGenerateContent = vi.fn();

vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: mockGenerateContent,
      };
    },
    Type: {
      OBJECT: "OBJECT",
      STRING: "STRING",
    },
  };
});

describe("generateStructured retries", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test";
    mockGenerateContent.mockReset();
  });

  it("retries on 503 and returns success on the second attempt", async () => {
    let attempts = 0;
    mockGenerateContent.mockImplementation(async () => {
      attempts++;
      if (attempts === 1) {
        throw new Error("503 Service Unavailable");
      }
      return { text: '{"status":"ok"}' };
    });

    const result = await generateStructured({
      logLabel: "test",
      model: "test-model",
      contents: "test contents",
      systemInstruction: "test instruction",
      responseSchema: { type: Type.OBJECT, properties: { status: { type: Type.STRING } } },
      validator: z.object({ status: z.string() }),
      temperature: 0,
    });

    expect(attempts).toBe(2);
    expect(result).toEqual({ status: "ok" });
  });

  it("retries on AbortError and returns success on the second attempt", async () => {
    let attempts = 0;
    mockGenerateContent.mockImplementation(async () => {
      attempts++;
      if (attempts === 1) {
        throw new DOMException("Timeout", "AbortError");
      }
      return { text: '{"status":"ok"}' };
    });

    const result = await generateStructured({
      logLabel: "test",
      model: "test-model",
      contents: "test contents",
      systemInstruction: "test instruction",
      responseSchema: { type: Type.OBJECT, properties: { status: { type: Type.STRING } } },
      validator: z.object({ status: z.string() }),
      temperature: 0,
    });

    expect(attempts).toBe(2);
    expect(result).toEqual({ status: "ok" });
  });
});
