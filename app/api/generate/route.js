import { NextResponse } from "next/server";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text : "";
  const mode = typeof body.mode === "string" ? body.mode : "30";

  return NextResponse.json({
    ok: true,
    output: text
      ? `DEX RADIO [:${mode}] ${text}`
      : `DEX RADIO [:${mode}] No input received`,
  });
}
