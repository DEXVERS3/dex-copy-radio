import { NextResponse } from "next/server";

export const runtime = "nodejs";

const OPENAI_URL = "https://api.openai.com/v1/responses";
const VERSION_STAMP = "[[DEX_API_GENERATE_V2_LOCKED]]";

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

function stripLabelLines(text) {
  return (text || "")
    .split("\n")
    .filter((line) => !/^\s*(DEX RADIO|BRAND|OFFER|CTA|MUST-SAY|DETAILS)\s*:/i.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function callOpenAI(apiKey, prompt) {
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

function durationRule(duration) {
  if (duration === 15) return "One beat. Punchy. ~35–55 words.";
  if (duration === 30) return "Two beats: recognition → payoff. ~70–95 words.";
  return "Scene → escalation → belonging. ~140–175 words.";
}

export async function POST(req) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const duration = pickDuration(body);

    const brand = s(body.brand);
    const offer = s(body.offer);
    const cta = s(body.cta);
    const mustSay = s(body.mustSay);
    const details = s(body.details || body.text);

    const prompt = `
Write a ${duration}-second radio commercial.

HARD RULES:
- Return ONLY spoken sentences.
- No headings. No labels. No bullets.
- Do not echo inputs back.

Use these ingredients (do NOT print as labels):
Brand: ${brand || "[BRAND]"}
Offer: ${offer || "[OFFER]"}
Details: ${details || "[NONE]"}
CTA context/location: ${cta || "[CTA]"}

MUST-SAY: Include this line verbatim ONCE, as the FINAL line:
"${mustSay || "NONE"}"

${durationRule(duration)}

Return ONLY the finished script.
`;

    // Call #1
    let res = await callOpenAI(apiKey, prompt);
    if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 500 });

    // Clean labels if model outputs them
    let cleaned = stripLabelLines(res.output);

    // Retry once if it still looks like intake / too short
    if (!cleaned || cleaned.split(/\s+/).length < 20) {
      const retry = await callOpenAI(
        apiKey,
        `INVALID: You echoed intake or output labels. Regenerate correctly.\n\n${prompt}`
      );
      if (retry.ok) cleaned = stripLabelLines(retry.output);
    }

    if (!cleaned || cleaned.split(/\s+/).length < 20) {
      return NextResponse.json({ ok: false, error: "Invalid output" }, { status: 500 });
    }

    // Visible stamp proves you're hitting THIS route
    return NextResponse.json({
      ok: true,
      output: `${VERSION_STAMP}\n${cleaned}`,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
