import { NextResponse } from "next/server";

export const runtime = "nodejs";

function s(v) {
  return typeof v === "string" ? v.trim() : "";
}

function stripDexHeader(text) {
  return s(text).replace(/^\[\[.*?\]\]\s*/m, "").trim();
}

function normalizeLine(line) {
  return s(line)
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .trim();
}

function addPerformanceShape(script) {
  const rawLines = stripDexHeader(script)
    .split("\n")
    .map(normalizeLine)
    .filter(Boolean);

  const lines = rawLines.map((line, index) => {
    let out = line;

    // stronger pause on all-caps promo lines
    if (/^[A-Z0-9'&$%!.,;:\-\s]+$/.test(out)) {
      out = out.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
    }

    // shape money / offer reads
    out = out.replace(/\s*;\s*/g, ". ");
    out = out.replace(/\s+-\s+/g, " — ");
    out = out.replace(/\bfor \$([0-9]+)/gi, "for $1 dollars");
    out = out.replace(/\$([0-9]+)/g, "$$$1");

    // make CTA and tag lines land harder
    if (
      /^(visit|stop by|get to|head to|go to|call|book|watch|join|fly|go birds|don’t miss|never miss)/i.test(out)
    ) {
      out = `Pause. ${out}`;
    }

    // slight dramatic pause before final line
    if (index === rawLines.length - 1) {
      out = `Pause. ${out}`;
    }

    if (!/[.!?]$/.test(out)) out += ".";
    return out;
  });

  return lines.join(" ");
}

function getVoiceProfile(preset) {
  switch (preset) {
    case "executive":
      return {
        voice: "cedar",
        instructions:
          "Perform this like a polished radio announcer, not a literal reader. Use broadcast cadence. Let the hook land. Separate the offer cleanly. Add slight energy lifts on promo lines. Pause before the call to action. Never sound robotic or like you are reading a list.",
      };

    case "veteran":
      return {
        voice: "marin",
        instructions:
          "Perform this like a seasoned radio pro. Calm authority. Natural pacing. Mild gravitas. Let short lines breathe. Treat each sentence like copy, not text on a page. Strong pause before the final call to action.",
      };

    case "urban":
      return {
        voice: "onyx",
        instructions:
          "Perform this with modern radio energy and command. Tight rhythm. Let promo lines hit. Do not read literally. Shape it like a produced station spot. Strong hook, clear offer, clean punchy close.",
      };

    case "female_modern":
      return {
        voice: "nova",
        instructions:
          "Perform this like a modern female commercial voice. Polished, confident, bright, natural. Add subtle attitude where helpful. Let the offer breathe. Treat this as radio copy, not narration.",
      };

    case "female_warm":
      return {
        voice: "sage",
        instructions:
          "Perform this with warmth, confidence, and commercial polish. Smooth and human. Use natural announcer pacing. Shape the read with pauses and emphasis so it sounds like a produced radio promo, not literal narration.",
      };

    default:
      return {
        voice: "cedar",
        instructions:
          "Perform this like a professional radio announcer. Broadcast pacing. Natural emphasis. Pause before the CTA. Never read literally.",
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

    const shaped = addPerformanceShape(script);
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
