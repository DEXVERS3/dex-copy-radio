import { NextResponse } from "next/server";

export const runtime = "nodejs";

function s(v) {
  return typeof v === "string" ? v.trim() : "";
}

function stripDexHeader(text) {
  return s(text).replace(/^\[\[.*?\]\]\s*/m, "").trim();
}

function shapeDelivery(script) {
  return stripDexHeader(script)
    .replace(/\r/g, "")
    .replace(/\n{2,}/g, "\n")
    .replace(/\n/g, ". ")
    .replace(/:\s*/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
}

function getVoiceProfile(preset) {
  switch (preset) {
    case "executive":
      return {
        voice: "cedar",
        instructions:
          "Deliver like a polished senior radio announcer. Controlled authority. Clean pacing. Strong confidence. Slight emphasis on the offer. Clear pause before the call to action.",
      };
    case "veteran":
      return {
        voice: "marin",
        instructions:
          "Deliver like a seasoned broadcast pro. Calm authority. Natural confidence. Slight gravitas. Never robotic. Let key phrases land with measured pauses.",
      };
    case "urban":
      return {
        voice: "onyx",
        instructions:
          "Deliver with modern command and natural urban energy. Tight rhythm. Confident without hype. Strong hook. Clean offer read. Sharp close.",
      };
    case "female_modern":
      return {
        voice: "nova",
        instructions:
          "Deliver like a modern female radio professional. Clean, confident, polished, commercial-ready. Strong clarity. Natural pacing. Subtle emphasis on the hook and CTA.",
      };
    case "female_warm":
      return {
        voice: "sage",
        instructions:
          "Deliver with warmth, confidence, and professional authority. Human, inviting, smooth, and composed. Strong readability. Natural announcer pacing.",
      };
    default:
      return {
        voice: "cedar",
        instructions:
          "Deliver like a professional radio announcer. Natural cadence. Clean sentence breaks. Slight emphasis on the offer. Clear pause before the CTA.",
      };
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const script = s(body.script || body.text);
    const preset = s(body.voicePreset || body.voice || "executive");

    if (!script) {
      return NextResponse.json({ ok: false, error: "No script provided." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "OPENAI_API_KEY is missing." }, { status: 500 });
    }

    const shaped = shapeDelivery(script);
    const profile = getVoiceProfile(preset);

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: profile.voice,
        input: shaped,
        instructions: profile.instructions,
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: text || `Voice generation failed (${response.status})` },
        { status: 500 }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Voice route failed." },
      { status: 500 }
    );
  }
}
