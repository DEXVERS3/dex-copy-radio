import { NextResponse } from "next/server";

export const runtime = "nodejs";
const OPENAI_URL = "https://api.openai.com/v1/responses";
const VERSION = "DEX_RADIO_ROUTE_V5_MODEL_DURATION_LOCK";

function s(v) { return typeof v === "string" ? v.trim() : ""; }
function getBrief(body) { return body?.brief && typeof body.brief === "object" ? body.brief : {}; }

function pick(body, brief, keys) {
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

function durationSpec(duration) {
  if (duration === 15) {
    return `
DURATION LOCK: :15 ONLY.
SHAPE: 1 beat. Velocity + punch. One turn.
REQUIRED: One clean move + close.
FORBIDDEN: development, lists, headers.
`;
  }
  if (duration === 30) {
    return `
DURATION LOCK: :30 ONLY.
SHAPE: 2 beats (recognition/contrast → payoff/authority + close).
REQUIRED: Development. Must feel built, not shortened.
FORBIDDEN: lists, headers, “copy points”.
`;
  }
  return `
DURATION LOCK: :60 ONLY.
SHAPE: scene → escalation → belonging.
REQUIRED: A real scene + escalation.
FORBIDDEN: padding, lists, headers.
`;
}

function includesVerbatim(out, phrase) {
  const o = s(out).toLowerCase();
  const p = s(phrase);
  if (!p || p === "NONE" || p === "[NONE]") return true;
  return o.includes(p.toLowerCase());
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
  if (!r.ok) return { ok: false, error: data?.error?.message || "OpenAI request failed" };

  const out =
    (typeof data.output_text === "string" && data.output_text) ||
    data?.output?.[0]?.content?.[0]?.text ||
    "";

  return { ok: true, output: s(out) };
}

const NODE = `
YOU ARE DEX-RADIO.
RETURN ONLY A FINISHED, BROADCAST-READY RADIO SCRIPT.
NO HEADERS. NO LABELS. NO BULLETS. NO RESTATING INTAKE.

BOX RULES:
- Box 3 (Audience) and Box 4 (Tone) are SETTINGS ONLY. Never print them.
- Box 6 (MUST-SAY) is mandatory and verbatim.
- Box 5 (CTA) is action context; include it if needed to complete the action.
- If LOCATION exists (even if stuffed into CTA), include it verbatim once.

QUALITY:
Recognition > explanation. Assume shared context. Restraint signals confidence.
`;

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
    const brief = getBrief(body);

    const duration = pickDuration(body);

    // Read structured fields first (reliable), but accept old "text" too
    const brand = pick(body, brief, ["brand","property","client","sponsor","business","businessName","company"]);
    const offer = pick(body, brief, ["offer","deal","promo","promotion","hook","headline","offerText"]);
    const audience = pick(body, brief, ["audience","target","listener","listeners","demo","demographic"]);
    const tone = pick(body, brief, ["tone","voice","style"]);

    const cta = pick(body, brief, ["cta","callToAction","call_to_action","ctaText","cta_text","action","actionText"]);
    const mustSay = pick(body, brief, ["mustSay","must_say","mustsay","legal","required","requirements","verbatim","mustHave","mustHaveCopy"]) || "NONE";
    const details = pick(body, brief, ["details","notes","copyPoints","points","copy_points","text","input","prompt"]) || s(body?.text);

    // If user stuffs location into CTA, treat CTA as location fallback
    const location = pick(body, brief, ["location","address","where","city","town","neighborhood"]) || cta || "NONE";

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const prompt = `
${NODE}
${durationSpec(duration)}

INPUTS:
DURATION: :${duration}
BRAND (1): ${brand || "[MISSING BRAND]"}
OFFER (2): ${offer || "[NONE]"}
AUDIENCE (3 setting): ${audience || "[NONE]"}
TONE (4 setting): ${tone || "[NONE]"}
CTA (5): ${cta || "[NONE]"}
MUST-SAY (6 verbatim): ${mustSay}
DETAILS (7): ${details || "[NONE]"}
LOCATION (verbatim if provided): ${location}
`;

    // Call 1
    let result = await callOpenAI({ apiKey, model, prompt });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error, meta: { version: VERSION, duration } },
        { status: 500 }
      );
    }

    // Enforce MUST-SAY + LOCATION with one corrective retry
    const needMust = mustSay && mustSay !== "NONE";
    const needLoc = location && location !== "NONE" && location !== "[NONE]";

    const missingMust = needMust && !includesVerbatim(result.output, mustSay);
    const missingLoc = needLoc && !includesVerbatim(result.output, location);

    if (missingMust || missingLoc) {
      const correction = `
${prompt}

CORRECTION:
Your output is invalid.
${missingMust ? `- MUST-SAY missing verbatim: "${mustSay}"` : ""}
${missingLoc ? `- LOCATION missing verbatim: "${location}"` : ""}
Regenerate ONE :${duration} script. Output ONLY the script. No headers.
`;
      const retry = await callOpenAI({ apiKey, model, prompt: correction });
      if (retry.ok && retry.output) result = retry;
    }

    // Final: return only the script
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
