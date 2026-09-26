import mammoth from "mammoth";

/**
 * DOCX is parsed locally rather than sent to Gemini: the text is already in the
 * file, so a model call would add cost and latency for no accuracy gain.
 */
export async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}
