import { z } from "zod";
import { generateStructured, MODELS } from "./client";
import { PDF_TRANSCRIPTION_SYSTEM_PROMPT } from "./prompts";
import { extractTextResponseSchema } from "./schemas";

const extractedTextSchema = z.object({ text: z.string() });

/**
 * Transcribes a PDF with Gemini's native document input instead of a local PDF
 * parser: it copes with odd encodings and layouts, and adds no parsing
 * dependency to the server bundle.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const { text } = await generateStructured({
    logLabel: "gemini.extractPdf",
    model: MODELS.fast,
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              data: buffer.toString("base64"),
              mimeType: "application/pdf",
            },
          },
          { text: "Extract the raw text from this document." },
        ],
      },
    ],
    systemInstruction: PDF_TRANSCRIPTION_SYSTEM_PROMPT,
    responseSchema: extractTextResponseSchema,
    validator: extractedTextSchema,
    temperature: 0.1,
  });
  return text.trim();
}
