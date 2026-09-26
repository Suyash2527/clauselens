import { NextResponse } from "next/server";
import { badRequest, payloadTooLarge, toSafeError, unsupportedMediaType } from "@/lib/errors";
import { extractDocxText } from "@/lib/extract/docx";
import { detectMimeType } from "@/lib/extract/mime";
import { extractPdfText } from "@/lib/gemini/extract-text";
import { sanitiseDocumentText } from "@/lib/injection-guard";
import { clientIpFromHeaders, enforceRateLimit } from "@/lib/rate-limit";
import { enforceSameOrigin } from "@/lib/origin-guard";

/** Node runtime: extraction needs `Buffer` and mammoth. */
export const runtime = "nodejs";

const MAX_BODY_BYTES = 5_000_000; // 5 MB
const FILE_TOO_LARGE_MESSAGE = "File is too large. Please upload a file under 5 MB.";

/** Below this, a "PDF" is almost certainly a scan with no text layer. */
const MIN_PDF_TEXT_CHARS = 200;

/**
 * Turns an uploaded PDF or DOCX into plain text for the textarea. The text is
 * sanitised here as well as at analysis time, because the user sees and can
 * edit it before submitting.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    enforceSameOrigin(request.headers);

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      throw unsupportedMediaType("Expected multipart/form-data.");
    }

    enforceRateLimit(clientIpFromHeaders(request.headers));

    // The header can be absent or wrong, so the buffer size is checked again below.
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) throw payloadTooLarge(FILE_TOO_LARGE_MESSAGE);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw badRequest("No file provided.");

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_BODY_BYTES) throw payloadTooLarge(FILE_TOO_LARGE_MESSAGE);

    const mime = detectMimeType(buffer);
    let extractedText: string;
    if (mime === "application/pdf") {
      extractedText = await extractPdfText(buffer);
      if (extractedText.length < MIN_PDF_TEXT_CHARS) {
        throw badRequest(
          "The PDF appears to be scanned or image-based, or it contains too little text. Please paste the text directly.",
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
