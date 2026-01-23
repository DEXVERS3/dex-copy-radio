import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const text = typeof body.text === "string" ? body.text : "";
    const mode = typeof body.mode === "string" ? body.mode : "30";

    return NextResponse.json({
      ok: true,
      output: text
        ? `DEX RADIO (safe): [:${mode}] ${text}`
        : "DEX RADIO (safe): No input received",
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Dex Radio API error (safe mode)" },
      { status: 500 }
    );
  }
}
