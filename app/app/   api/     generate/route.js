import { NextResponse } from "next/server";

export const runtime = "nodejs";

const OPENAI_URL = "https://api.openai.com/v1/responses";

function s(v) {
  return typeof v === "string" ? v.trim() : "";
}

function pickDuration(body) {
  const d = body?.duration ?? body?.seconds ?? body?.time ?? body?.mode ?? body?.len;
  const n = Number(d);
  if (n === 15 || n === 30 || n === 60) return n;
  if (typeof d === "string") {
    const m = d.match(/\b(15|30|60)\b/);
    if (m) return Number(m[1]);
  }
  return 30;
}

function getBrief(body) {
  return body?.brief && typeof body.brief === "object" ? body.brief : {};
}

function pick(body, brief, ...keys) {
  for (const k of keys) {
    const v = s(body?.[k]) || s(brief?.[k]);
    if (v) return v;
  }
  return "";
}

// -------------------- DEX-CORE (MINIMAL, NON-CREATIVE) --------------------
const DEX_CORE = `
YOU ARE DEX. EXECUTE. DO NOT PARAPHRASE THE OPERATOR. DO NOT RESTATE THE INTAKE.
NO PREAMBLE. OUTPUT ONLY THE DELIVERABLE.
`;

// -------------------- DEX-RADIO NODE (SHARED) --------------------
const DEX_RADIO_NODE_SHARED = `
NODE: DEX-RADIO
MISSION: Produce a finished, broadcast-ready radio spot at Mercury-level quality by compressing understanding, not padding words.

HARD BANS:
- No headers. No labels. No bullet points. No “:30 copy” titles.
- No paraphrase of the intake.
- No explanation of what you are doing.

MUST-SAY:
- If MUST-SAY is provided, it MUST appear verbatim.
- It should land late enough to be heard.

LOCATION:
- If LOCATION is provided (even if it was stuffed into CTA), it MUST appear verbatim once.

VOICE:
Peer. Minimal. Confident. Culturally fluent.
Recognition beats explanation. Silence is allowed.

OUTPUT:
Return ONLY the finished script. Nothing else.
`;

// -------------------- DURATION-SPECIFIC RULES (IF/THEN) --------------------
function durationRules(duration) {
  if (duration === 15) {
    return `
DURATION LOCK: :15 ONLY.
STRUCTURE: 1 beat. Velocity + punch. One turn.
LENGTH: ~35–55 words.
`;
  }
  if (duration === 30) {
    return `
DURATION LOCK: :30 ONLY.
STRUCTURE: 2 beats (recognition → authority/payoff).
LENGTH: ~70–95 words.
`;
  }
  return `
DURATION LOCK: :60 ONLY.
STRUCTURE: scene + escalation + belonging (arc).
LENGTH: ~140–175 words.
`;
}

// -------------------- ROUTE --------------------
export async function POST(req) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "Missing OPENAI_API_KEY env var" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const brief = getBrief(body);

    const duration = pickDuration(body);

    const brand = pick(body, brief, "brand", "property", "client", "sponsor");
    const audience = pick(body, brief, "audience", "target", "listener", "listeners");
    const offer = pick(body, brief, "offer", "deal", "promo", "promotion", "hook");
    const cta = pick(body, brief, "cta", "callToAction");

    // LOCATION FIX:
    // If you shoved location into CTA, we treat CTA as fallback LOCATION.
    const location =
      pick(body, brief, "location", "address", "where") || cta;

    const mustSay =
      pick(body, brief, "mustSay", "must_say", "legal", "required") || "NONE";

    const details =
      pick(body, brief, "details", "notes", "copyPoints", "points", "text", "input", "prompt");

    const prompt = `
${DEX_CORE}
${DEX_RADIO_NODE_SHARED}
${durationRules(duration)}

DURATION: :${duration}
BRAND / PROPERTY: ${brand || "[MISSING BRAND]"}
AUDIENCE: ${audience || "[MISSING AUDIENCE]"}
OFFER: ${offer || "[NONE]"}
LOCATION (VERBATIM): ${location || "[NONE]"}
CTA: ${cta || "[NONE]"}
MUST-SAY (VERBATIM): ${mustSay}
COPY POINTS / DETAILS: ${details || "[NONE]"}
`;

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const r = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: prompt,
      }),
    });

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      return NextResponse.json(
        { ok: false, error: data?.error?.message || "OpenAI request failed" },
        { status: 500 }
      );
    }

    const output =
      (typeof data.output_text === "string" && data.output_text) ||
      data?.output?.[0]?.content?.[0]?.text ||
      "";

    const finalText = String(output || "").trim();

    // Fail loudly if we somehow got nothing (prevents “echo intake” UIs from pretending success)
    if (!finalText) {
      return NextResponse.json(
        { ok: false, error: "Empty model output" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, output: finalText });
  } catch {
    return NextResponse.json(
      { ok: false, error: "DEX-RADIO generation failed" },
      { status: 500 }
    );
  }
}
