import { z } from "zod";
import { extractText } from "unpdf";
import { badRequest } from "../errors";
import { generateStructured, MODELS } from "./client";
import { PDF_TRANSCRIPTION_SYSTEM_PROMPT } from "./prompts";
import { extractTextResponseSchema } from "./schemas";

const extractedTextSchema = z.object({ text: z.string() });

/**
 * Transcribes a PDF with unpdf locally first. If it yields <200 chars (e.g. a scan),
 * it falls back to Gemini's native document input.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  let localText = "";
  try {
    const extracted = await extractText(new Uint8Array(buffer));
    localText = Array.isArray(extracted.text) ? extracted.text.join("\n") : String(extracted.text);
  } catch {
    throw badRequest("The PDF file is corrupt or invalid.");
  }

  const trimmed = localText.trim();
  if (trimmed.length >= 200) {
    return trimmed;
  }

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
