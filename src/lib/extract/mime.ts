export type MimeType = "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function detectMimeType(buffer: Buffer): MimeType | null {
  if (buffer.length < 4) return null;

  // PDF magic bytes: %PDF (25 50 44 46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return "application/pdf";
  }

  // DOCX magic bytes: PK\x03\x04 (50 4B 03 04)
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  return null;
}
