import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    status: "ok",
    demo: !process.env.GEMINI_API_KEY,
    uptime: process.uptime(),
  });
}
