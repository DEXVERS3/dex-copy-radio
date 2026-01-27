import { NextResponse } from "next/server";

export const runtime = "nodejs";
const OPENAI_URL = "https://api.openai.com/v1/responses";
const VERSION = "DEX_RADIO_GENERATE_ROUTE_DROPIN_V1";

function s(v) {
  return typeof v === "string" ? v.trim() : "";
}

function pickDuration(body) {
  const d = body?.mode ?? body?.duration ?? body?.seconds;
  const n = Number(d);
  if (n === 15 || n === 30 || n === 60) return n;
  if (typeof d === "string") {
    const m = d.match(/\b(15|30|60)\b/);
    if (m) return Number(m[1]);
  }
  return 30;
}

function looksLikeEcho(text) {
  const u = (text || "").toUpperCase();
  return (
    u.includes("DEX RADIO") ||
    u.includes("BRAND:") ||
    u.includes("OFFER:") ||
    u.includes("CTA:") ||
    u.includes("MUST-SAY:") ||
    u.includes("DETAILS:")
  );
}

async function callOpenAI({ apiKey, prompt }) {
  const r = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      input: prompt,
    }),
  });

  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = j?.error?.message || "OpenAI request failed";
    return { ok: false, error: msg };
  }

  const out =
    (typeof j.output_text === "string" && j.output_text) ||
    j?.output?.[0]?.content?.[0]?.text ||
    "";

  return { ok: true, output: s(out) };
}

function durationRules(duration) {
  if (duration === 15) return "DURATION: :15. One beat. Punchy. ~35–55 words.";
  if (duration === 30) return "DURATION: :30. Two beats. Recognition → payoff. ~70–95 words.";
  return "DURATION: :60. Scene → escalation → belonging. ~140–175 words.";
}

export async function POST(req) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "Missing OPENAI_API_KEY", meta: { version: VERSION } },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const duration = pickDuration(body);

    // Compatible with your page.js payload:
    const brand = s(body?.brand);
    const offer = s(body?.offer);
    const cta = s(body?.cta);
    const mustSay = s(body?.mustSay);
    const details = s(body?.details || body?.text || "");

    const prompt = `
You are DEX-RADIO.

Write a ${duration}-second radio spot.
${durationRules(duration)}

HARD OUTPUT RULES:
- Output ONLY the script (spoken sentences).
- No headings, no labels, no bullets, no "DEX RADIO".
- Do not echo the intake.

INGREDIENTS (do NOT repeat as labels):
Brand: ${brand || "[BRAND]"}
Offer: ${offer || "[OFFER]"}
CTA/Location context: ${cta || "[CTA]"}
Details: ${details || "[DETAILS]"}

MUST-SAY:
Include this line verbatim ONCE, as the FINAL line:
"${mustSay || "NONE"}"
`;

    let res = await callOpenAI({ apiKey, prompt });
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: res.error, meta: { version: VERSION, duration } },
        { status: 500 }
      );
    }

    // One hard retry if it echoes intake/labels
    if (!res.output || looksLikeEcho(res.output)) {
      const retryPrompt = `
INVALID: You echoed intake or used labels.

Regenerate ONE ${duration}-second spot:
- spoken sentences only
- no headings/labels
- must-say once at end

${prompt}
`;
      const retry = await callOpenAI({ apiKey, prompt: retryPrompt });
      if (retry.ok && retry.output) res = retry;
    }

    if (!res.output || looksLikeEcho(res.output)) {
      return NextResponse.json(
        { ok: false, error: "Invalid output (echo/labels).", meta: { version: VERSION, duration } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      output: res.output,
      meta: { version: VERSION, duration },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Dex Radio API error", meta: { version: VERSION } },
      { status: 500 }
    );
  }
}
