import { NextResponse } from "next/server";

export const runtime = "nodejs";
const OPENAI_URL = "https://api.openai.com/v1/responses";
const VERSION = "DEX_RADIO_ROUTE_V6_REJECT_LABEL_ECHO_DEDUP_MUSTSAY";

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
  if (duration === 15) return "DURATION LOCK: :15 ONLY. 1 beat. ~35–55 words. One turn.";
  if (duration === 30) return "DURATION LOCK: :30 ONLY. 2 beats (recognition → payoff). ~70–95 words.";
  return "DURATION LOCK: :60 ONLY. Scene → escalation → belonging. ~140–175 words.";
}

function looksLikeLabelEcho(out) {
  const t = s(out);
  if (!t) return true;
  const upper = t.toUpperCase();

  // If it contains the intake labels, it's invalid output
  const labelHits =
    upper.includes("DEX RADIO") ||
    upper.includes("BRAND:") ||
    upper.includes("OFFER:") ||
    upper.includes("CTA:") ||
    upper.includes("MUST-SAY:") ||
    upper.includes("DETAILS:");

  // Also reject if it looks like just a few short lines with no sentence punctuation
  const hasPunct = /[.!?]/.test(t);
  const lines = t.split("\n").map(x => x.trim()).filter(Boolean);
  const looksListy = lines.length <= 8 && !hasPunct;

  return labelHits || looksListy;
}

function includesVerbatim(out, phrase) {
  const o = s(out).toLowerCase();
  const p = s(phrase);
  if (!p || p === "NONE" || p === "[NONE]") return true;
  return o.includes(p.toLowerCase());
}

function dedupeMustSay(out, mustSay) {
  const ms = s(mustSay);
  if (!ms || ms === "NONE" || ms === "[NONE]") return s(out);

  // Remove repeated occurrences, then append once at end.
  let text = s(out);
  const pattern = new RegExp(ms.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  text = text.replace(pattern, "").replace(/\n{3,}/g, "\n\n").trim();

  // Append must-say at end
  if (!text.toLowerCase().includes(ms.toLowerCase())) {
    text = `${text}\n${ms}`.trim();
  } else {
    // if it still exists once, keep it; but ensure it lands late:
    // move it to the end by removing first and appending
    text = text.replace(pattern, "").replace(/\n{3,}/g, "\n\n").trim();
    text = `${text}\n${ms}`.trim();
  }
  return text;
}

async function callOpenAI({ apiKey, model, prompt }) {
  const r = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
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

OUTPUT RULES:
- Output ONLY the finished radio script. No headings. No labels. No lists.
- Do NOT print: "DEX RADIO", "BRAND:", "OFFER:", "CTA:", "MUST-SAY:", "DETAILS:".
- Intake is ingredients. Output is spoken sentences.

BOX RULES:
- Box 3 (Audience) and Box 4 (Tone) are SETTINGS ONLY. Never printed.
- Box 6 (MUST-SAY) must appear verbatim ONCE, landing at the end.
- Box 5 (CTA) should be included if needed to complete the action.
- If LOCATION exists (even if stuffed into CTA), include it verbatim once.

QUALITY:
Recognition > explanation. Confident restraint.
`;

export async function POST(req) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "Missing OPENAI_API_KEY", meta: { version: VERSION } }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const brief = getBrief(body);
    const duration = pickDuration(body);

    const brand = pick(body, brief, ["brand","property","client","sponsor","business","businessName","company"]);
    const offer = pick(body, brief, ["offer","deal","promo","promotion","hook","headline","offerText"]);
    const audience = pick(body, brief, ["audience","target","listener","listeners","demo","demographic"]);
    const tone = pick(body, brief, ["tone","voice","style"]);

    const cta = pick(body, brief, ["cta","callToAction","call_to_action","ctaText","cta_text","action","actionText"]);
    const mustSay = pick(body, brief, ["mustSay","must_say","mustsay","legal","required","requirements","verbatim","mustHave","mustHaveCopy"]) || "NONE";
    const details = pick(body, brief, ["details","notes","copyPoints","points","copy_points","text","input","prompt"]) || s(body?.text);

    const location = pick(body, brief, ["location","address","where","city","town","neighborhood"]) || cta || "NONE";

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const prompt = `
${NODE}
${durationSpec(duration)}

INPUTS:
DURATION: :${duration}
BRAND: ${brand || "[MISSING BRAND]"}
OFFER: ${offer || "[NONE]"}
AUDIENCE (setting): ${audience || "[NONE]"}
TONE (setting): ${tone || "[NONE]"}
CTA: ${cta || "[NONE]"}
LOCATION (verbatim if provided): ${location}
MUST-SAY (verbatim; ONCE at end): ${mustSay}
DETAILS: ${details || "[NONE]"}
`;

    // Call 1
    let res = await callOpenAI({ apiKey, model, prompt });
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: res.error, meta: { version: VERSION, duration } }, { status: 500 });
    }

    // Reject label/echo output; retry once with hard correction
    if (looksLikeLabelEcho(res.output)) {
      const correction = `
${prompt}

CORRECTION:
Your output was invalid because it echoed labels/intake.
Regenerate ONE :${duration} script in spoken sentences only.
No headings. No labels. No lists.
`;
      const retry = await callOpenAI({ apiKey, model, prompt: correction });
      if (retry.ok && retry.output) res = retry;
    }

    // Enforce must-say/location
    let finalText = s(res.output);

    // If still label/echo after retry, fail loudly so you see it
    if (looksLikeLabelEcho(finalText)) {
      return NextResponse.json(
        { ok: false, error: "Invalid output (label/echo). Backend is being hit but model isn't complying.", meta: { version: VERSION, duration } },
        { status: 500 }
      );
    }

    // Ensure must-say appears once at end
    finalText = dedupeMustSay(finalText, mustSay);

    // If location provided, require it
    if (location && location !== "NONE" && location !== "[NONE]") {
      if (!includesVerbatim(finalText, location)) {
        const correction2 = `
${prompt}

CORRECTION:
LOCATION was missing verbatim: "${location}"
Regenerate ONE :${duration} script. Spoken sentences only. No labels.
MUST-SAY must appear once at end.
`;
        const retry2 = await callOpenAI({ apiKey, model, prompt: correction2 });
        if (retry2.ok && retry2.output && !looksLikeLabelEcho(retry2.output)) {
          finalText = dedupeMustSay(retry2.output, mustSay);
        }
      }
    }

    // Final must-say presence check
    if (mustSay && mustSay !== "NONE" && !includesVerbatim(finalText, mustSay)) {
      finalText = `${finalText}\n${mustSay}`.trim();
    }

    return NextResponse.json({
      ok: true,
      output: finalText,
      meta: { version: VERSION, duration },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "DEX-RADIO generation failed", meta: { version: VERSION } }, { status: 500 });
  }
}
