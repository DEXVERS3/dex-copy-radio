import { NextResponse } from "next/server";

export const runtime = "nodejs";
const OPENAI_URL = "https://api.openai.com/v1/responses";
const VERSION = "DEX_RADIO_ROUTE_V7_FINAL_FORCE_GENERATION";

function s(v) {
  return typeof v === "string" ? v.trim() : "";
}

function pickDuration(body) {
  const d = body?.mode ?? body?.duration ?? body?.seconds;
  const n = Number(d);
  if (n === 15 || n === 30 || n === 60) return n;
  return 30;
}

function looksLikeEcho(text) {
  const u = text.toUpperCase();
  return (
    u.includes("DEX RADIO") ||
    u.includes("BRAND:") ||
    u.includes("OFFER:") ||
    u.includes("CTA:") ||
    u.includes("MUST-SAY:") ||
    u.includes("DETAILS:")
  );
}

async function callOpenAI(prompt, apiKey) {
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
  const out =
    j?.output_text ||
    j?.output?.[0]?.content?.[0]?.text ||
    "";

  return s(out);
}

export async function POST(req) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "Missing API key" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const duration = pickDuration(body);

    const brand = s(body.brand);
    const offer = s(body.offer);
    const cta = s(body.cta);
    const mustSay = s(body.mustSay);
    const details = s(body.details || body.text);

    const prompt = `
You are DEX-RADIO.

Write a ${duration}-second radio commercial.
This must be spoken sentences only.
No labels. No headings. No lists.

Rules:
- Assume shared cultural knowledge.
- Do not explain.
- Do not repeat.
- Sound confident and human.

Include naturally:
Brand: ${brand}
Offer: ${offer}
Details: ${details}
CTA context: ${cta}

The following line MUST appear verbatim ONCE, at the very end:
"${mustSay}"

Return ONLY the finished script.
`;

    let output = await callOpenAI(prompt, apiKey);

    // HARD BLOCK ECHO — retry once
    if (!output || looksLikeEcho(output)) {
      const retryPrompt = `
Your previous output was INVALID because it echoed input.

Rewrite the ${duration}-second radio spot properly.
No labels. No intake language. Spoken copy only.

${prompt}
`;
      output = await callOpenAI(retryPrompt, apiKey);
    }

    // Final guard
    if (!output || looksLikeEcho(output)) {
      return NextResponse.json(
        { ok: false, error: "Model failed to generate valid radio copy.", meta: { version: VERSION } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      output,
      meta: { version: VERSION, duration },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Generation failed" }, { status: 500 });
  }
}
