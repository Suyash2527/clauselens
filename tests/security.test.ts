import { describe, expect, it } from "vitest";
import { maskPii } from "@/lib/pii";
import { POST as analyzePost } from "@/app/api/analyze/route";
import { POST as askPost } from "@/app/api/ask/route";
import { POST as extractPost } from "@/app/api/extract/route";

describe("Security: PII masking", () => {
  it("masks Aadhaar numbers", () => {
    const { text, masked } = maskPii("My Aadhaar is 2345 6789 0123.");
    expect(text).toBe("My Aadhaar is [AADHAAR].");
    expect(masked).toBe(1);
  });

  it("masks PAN numbers", () => {
    const { text, masked } = maskPii("PAN: ABCDE1234F");
    expect(text).toBe("PAN: [PAN]");
    expect(masked).toBe(1);
  });

  it("masks IFSC codes", () => {
    const { text, masked } = maskPii("IFSC is HDFC0123456.");
    expect(text).toBe("IFSC is [IFSC].");
    expect(masked).toBe(1);
  });

  it("masks Phone numbers", () => {
    const { text, masked } = maskPii("Call me at +91 9876543210 or 9876543210.");
    expect(text).toBe("Call me at [PHONE] or [PHONE].");
    expect(masked).toBe(2);
  });

  it("masks Email addresses", () => {
    const { text, masked } = maskPii("Email test@example.com for info.");
    expect(text).toBe("Email [EMAIL] for info.");
    expect(masked).toBe(1);
  });

  it("masks Account numbers", () => {
    const { text, masked } = maskPii("Transfer to 12345678901234.");
    expect(text).toBe("Transfer to [ACCOUNT].");
    expect(masked).toBe(1);
  });

  it("masks multiple different PII types at once", () => {
    const { text, masked } = maskPii("Email test@example.com, PAN ABCDE1234F, and IFSC SBIN0123456.");
    expect(text).toBe("Email [EMAIL], PAN [PAN], and IFSC [IFSC].");
    expect(masked).toBe(3);
  });

  it("replaces ALL instances globally and correctly counts them", () => {
    const { text, masked } = maskPii("Email a@b.com and c@d.com.");
    expect(text).toBe("Email [EMAIL] and [EMAIL].");
    expect(masked).toBe(2);
  });
});

describe("Security: API Routes (analyze)", () => {
  it("returns 403 for foreign Origin", async () => {
    const req = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { origin: "https://evil.com" },
    });
    const res = await analyzePost(req);
    expect(res.status).toBe(403);
  });

  it("returns 415 for wrong content-type", async () => {
    const req = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "content-type": "text/plain" },
    });
    const res = await analyzePost(req);
    expect(res.status).toBe(415);
  });

  it("returns 413 for oversized content-length", async () => {
    const req = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": "9999999" },
    });
    const res = await analyzePost(req);
    expect(res.status).toBe(413);
  });
});

describe("Security: API Routes (ask)", () => {
  it("returns 403 for foreign Origin", async () => {
    const req = new Request("http://localhost/api/ask", {
      method: "POST",
      headers: { origin: "https://evil.com" },
    });
    const res = await askPost(req);
    expect(res.status).toBe(403);
  });

  it("returns 415 for wrong content-type", async () => {
    const req = new Request("http://localhost/api/ask", {
      method: "POST",
      headers: { "content-type": "text/plain" },
    });
    const res = await askPost(req);
    expect(res.status).toBe(415);
  });

  it("returns 413 for oversized content-length", async () => {
    const req = new Request("http://localhost/api/ask", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": "9999999" },
    });
    const res = await askPost(req);
    expect(res.status).toBe(413);
  });
});

describe("Security: API Routes (extract)", () => {
  it("returns 403 for foreign Origin", async () => {
    const req = new Request("http://localhost/api/extract", {
      method: "POST",
      headers: { origin: "https://evil.com" },
    });
    const res = await extractPost(req);
    expect(res.status).toBe(403);
  });

  it("returns 415 for wrong content-type", async () => {
    const req = new Request("http://localhost/api/extract", {
      method: "POST",
      headers: { "content-type": "text/plain" },
    });
    const res = await extractPost(req);
    expect(res.status).toBe(415);
  });

  it("returns 413 for oversized content-length", async () => {
    const req = new Request("http://localhost/api/extract", {
      method: "POST",
      headers: { "content-type": "multipart/form-data", "content-length": "9999999" },
    });
    const res = await extractPost(req);
    expect(res.status).toBe(413);
  });
});
