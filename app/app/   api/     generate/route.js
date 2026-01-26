import { NextResponse } from "next/server";

export const runtime = "nodejs";
const OPENAI_URL = "https://api.openai.com/v1/responses";

// VERSION TAG (so you can confirm the app is hitting THIS route)
const VERSION = "DEX_RADIO_ROUTE_V3_NO_WRITE_LESS";

function s(v) {
  return typeof v === "string" ? v.trim() : "";
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

// ------- DEX CORE (tight; no “write less”) -------
const DEX_CORE = `
YOU ARE DEX-RADIO.
DO NOT PARAPHRASE THE OPERATOR.
DO NOT RESTATE THE INTAKE.
OUTPUT ONLY THE FINISHED RADIO SCRIPT.
NO HEADERS. NO LABELS. NO BULLETS. NO NOTES.
`;

// ------- NODE SHARED RULES -------
const NODE_SHARED = `
NON-NEGOTIABLES:
- Intake fields are ingredients. The output must be a spoken script, not the ingredients.
- MUST-SAY (if provided) must appear verbatim and land late enough to be heard.
- If LOCATION is provided, it must appear verbatim once.
- Audience and Tone are SETTINGS only (do not print “AUDIENCE:” or “TONE:”).
- Recognition > explanation. Do not explain what the audience already knows.
`;

// ------- DURATION RULES (no “write less”; only structure) -------
function durationBlock(duration) {
  if (duration === 15) {
    return `
DURATION LOCK: :15 ONLY.
SHAPE: 1 beat. Velocity + punch. One turn.
REQUIRED: One clear move + clean close.
FORBIDDEN: development, scene-building, multiple angles.
`;
  }
  if (duration === 30) {
    return `
DURATION LOCK: :30 ONLY.
SHAPE: 2 beats. Beat 1 = recognition/contrast. Beat 2 = authority/payoff + close.
REQUIRED: Development. A :30 must feel built, not shortened.
FORBIDDEN: idea list, outline, or anything that reads like notes.
`;
  }
  return `
DURATION LOCK: :60 ONLY.
SHAPE: scene → escalation → belonging (arc).
REQUIRED: A real scene and escalation. A :60 must feel like a place, not a longer list.
FORBIDDEN: padding or “extended :30.”
`;
}

// ------- Echo detector (if we get intake back, retry once) -------
function looksLikeEcho(output, brand, offer, details) {
  const o = s(output);
  if (!o) return true;

  // If output is basically just the raw points (brand/offer/details) with no sentence rhythm.
  const hasPunct = /[.!?]/.test(o);
  const lines = o.split("\n").map(x => x.trim()).filter(Boolean);

  const echoSignals =
    lines.length <= 5 &&
    lines.some(l => l.toUpperCase() === l && l.length > 6) && // ALL CAPS blocks
    (!hasPunct || lines.every(l => l.length < 60));

  const containsBrand = brand && o.toLowerCase().includes(brand.toLowerCase());
  const containsOffer = offer && o.toLowerCase().includes(offer.toLowerCase());

  // If it contains only the obvious tokens and reads like a header list
  return echoSignals && containsBrand && (containsOffer || (!!details && o.includes(details)));
}

async function callOpenAI({ apiKey, model, prompt }) {
  const r = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: prompt }),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    return { ok: false, error: data?.error?.message || "OpenAI request failed" };
  }

  const out =
    (typeof data.output_text === "string" && data.output_text) ||
    data?.output?.[0]?.content?.[0]?.text ||
    "";

  return { ok: true, output: s(out) };
}

export async function POST(req) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "Missing OPENAI_API_KEY env var", meta: { version: VERSION } },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const brief = getBrief(body);

    const duration = pickDuration(body);

    // INPUTS (accept top-level OR brief.*)
    const brand = pick(body, brief, "brand", "property", "client", "sponsor");
    const offer = pick(body, brief, "offer", "deal", "promo", "promotion", "hook");
    const audience = pick(body, brief, "audience", "target", "listener", "listeners");
    const tone = pick(body, brief, "tone");
    const cta = pick(body, brief, "cta", "callToAction");

    // LOCATION: explicit field OR fallback to CTA (your current workflow)
    const location = pick(body, brief, "location", "address", "where") || cta;

    const mustSay =
      pick(body, brief, "mustSay", "must_say", "legal", "required") || "NONE";

    const details =
      pick(body, brief, "details", "notes", "copyPoints", "points", "text", "input", "prompt");

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const promptBase = `
${DEX_CORE}
${NODE_SHARED}
${durationBlock(duration)}

DURATION: :${duration}
BRAND: ${brand || "[MISSING BRAND]"}
OFFER: ${offer || "[NONE]"}
AUDIENCE (SETTING): ${audience || "[NONE]"}
TONE (SETTING): ${tone || "[NONE]"}
LOCATION (VERBATIM IF PROVIDED): ${location || "[NONE]"}
CTA: ${cta || "[NONE]"}
MUST-SAY (VERBATIM): ${mustSay}
DETAILS / COPY POINTS: ${details || "[NONE]"}
`;

    // Call 1
    let result = await callOpenAI({ apiKey, model, prompt: promptBase });

    // If it echoed the intake, retry once with a hard corrective
    if (result.ok && looksLikeEcho(result.output, brand, offer, details)) {
      const retryPrompt = `
${promptBase}

CORRECTION:
Your last output echoed intake/headers. That is invalid.
Return ONLY a finished :${duration} radio script in spoken sentences.
No headings. No labels. No bullet points. No restating inputs.
`;
      result = await callOpenAI({ apiKey, model, prompt: retryPrompt });
    }

    if (!result.ok || !result.output) {
      return NextResponse.json(
        { ok: false, error: result.error || "Empty model output", meta: { version: VERSION, duration } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      output: result.output,
      meta: { version: VERSION, duration },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "DEX-RADIO generation failed", meta: { version: VERSION } },
      { status: 500 }
    );
  }
}
