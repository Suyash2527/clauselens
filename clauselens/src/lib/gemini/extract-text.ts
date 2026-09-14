import { z } from "zod";
import { getGenAI, MODELS } from "./client";
import { extractTextResponseSchema } from "./schemas";
import { upstreamFailure } from "../errors";
import { safeJsonParse } from "./classify-clauses";

const responseSchema = z.object({ text: z.string() });

const SYSTEM_PROMPT = `You are a high-accuracy document transcription engine.
Your sole job is to read the attached document and return its complete text exactly as written.

CRITICAL INSTRUCTIONS:
1. Transcribe the text VERBATIM.
2. Preserve all clause numbering, headers, bullet points, and document structure.
3. DO NOT summarize, paraphrase, reformat, or omit any part of the text.
4. DO NOT add any commentary or preamble.
5. If the document is a scanned image with no readable text, return an empty string.`;

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const ai = getGenAI();
  let raw: string;
  try {
    const response = await ai.models.generateContent({
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
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: extractTextResponseSchema,
        temperature: 0.1,
      },
    });
    raw = response.text ?? "";
  } catch (error) {
    console.error("[gemini.extractPdf]", error);
    throw upstreamFailure();
  }

  const parsed = responseSchema.safeParse(safeJsonParse(raw));
  if (!parsed.success) {
    console.error("[gemini.extractPdf] schema mismatch", parsed.error.issues);
    throw upstreamFailure();
  }
  return parsed.data.text.trim();
}
