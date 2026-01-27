import { NextResponse } from "next/server";

export const runtime = "nodejs";

const OPENAI_URL = "https://api.openai.com/v1/responses";

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
    u.includes("NO INPUT RECEIVED") ||
    u.includes("BRAND:") ||
    u.includes("OFFER:") ||
    u.includes("CTA:") ||
    u.includes("MUST-SAY:") ||
    u.includes("DETAILS:")
  );
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

function durationRules(duration) {
  if (duration === 15) return "One beat. Fast. Punchy. ~40 words.";
  if (duration === 30) return "Two beats. Recognition then payoff. ~80 words.";
  return "Scene, escalation, belonging. ~160 words.";
}

export async function POST(req) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const duration = pickDuration(body);

    const brand = s(body.brand);
    const offer = s(body.offer);
    const cta = s(body.cta);
    const mustSay = s(body.mustSay);
    const details = s(body.details || body.text || "");

    const prompt = `
Write a ${duration}-second radio commercial.

RULES:
- Spoken sentences only.
- No labels, headings, or echoing input.
- Structure must change by duration.

INGREDIENTS:
Brand: ${brand}
Offer: ${offer}
Details: ${details}
CTA context: ${cta}

MUST-SAY (verbatim, ONCE, final line):
"${mustSay}"

${durationRules(duration)}

Return ONLY the finished script.
`;

    let res = await callOpenAI(apiKey, prompt);

    if (!res.ok || !res.output || looksLikeEcho(res.output)) {
      res = await callOpenAI(
        apiKey,
        `Rewrite correctly. No labels. No echo.\n\n${prompt}`
      );
    }

    if (!res.ok || !res.output || looksLikeEcho(res.output)) {
      return NextResponse.json(
        { ok: false, error: "Invalid model output" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      output: res.output,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
