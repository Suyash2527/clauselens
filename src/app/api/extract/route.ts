import { NextResponse } from "next/server";
import { clientKey, enforceRateLimit } from "@/lib/rate-limit";
import { badRequest, toSafeError } from "@/lib/errors";
import { detectMimeType } from "@/lib/extract/mime";
import { extractPdfText } from "@/lib/gemini/extract-text";
import { extractDocxText } from "@/lib/extract/docx";
import { sanitiseDocumentText } from "@/lib/injection-guard";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 5_000_000; // 5 MB

export async function POST(request: Request): Promise<NextResponse> {
  try {
    enforceRateLimit(clientKey(request.headers));

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      throw badRequest("File is too large. Please upload a file under 5 MB.");
    }

    const formData = await request.formData();
    const file = formData.get("file");
    
    if (!file || !(file instanceof File)) {
      throw badRequest("No file provided.");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_BODY_BYTES) {
      throw badRequest("File is too large. Please upload a file under 5 MB.");
    }

    const mime = detectMimeType(buffer);
    let extractedText = "";

    if (mime === "application/pdf") {
      extractedText = await extractPdfText(buffer);
      if (extractedText.length < 200) {
        throw badRequest(
          "The PDF appears to be scanned or image-based, or it contains too little text. Please paste the text directly."
        );
      }
    } else if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      extractedText = await extractDocxText(buffer);
    } else {
      throw badRequest("Unsupported file type. Please upload a valid PDF or DOCX file.");
    }

    const { text: sanitisedText } = sanitiseDocumentText(extractedText);

    return NextResponse.json({ text: sanitisedText });
  } catch (error) {
    const { status, body } = toSafeError(error);
    return NextResponse.json(body, { status });
  }
}
