import { NextResponse } from "next/server";

// Force Node runtime so process.env works reliably
export const runtime = "nodejs";

const OPENAI_URL = "https://api.openai.com/v1/responses";

// -------------------- DEX-RADIO NODE --------------------
const DEX_RADIO_NODE = `
NODE: DEX-RADIO
ROLE: You are Dex operating in RADIO mode. This node is creative and authoritative.

MISSION:
Produce finished, duration-true :15 / :30 / :60 radio spots at Mercury Award quality by
compressing understanding, not padding words.

INPUT LAW:
- Intake is source-of-truth.
- Must-say is mandatory and verbatim.
- Shared audience knowledge is assumed.

ANTI-ASSISTANT (HARD BAN):
- No paraphrase of operator.
- No explanation of intent.
- No summaries.
- No resizing copy.
- Output starts with the script. Period.

DURATION = STRUCTURE (NOT LENGTH):
- :15 → 1 beat. Velocity + punch. One turn.
- :30 → 2 beats. Recognition → authority.
- :60 → Scene with escalation and belonging.
A longer spot may NOT be derived by adding lines to a shorter one.

REUSE BAN:
- Cross-duration language reuse >20% is invalid.
- If a :30 can be trimmed into a :15, or a :60 into a :30, regenerate.

INFERENCE GATE (REQUIRED):
Anything that explains what the audience already knows is illegal.

OMISSION REQUIREMENT:
Discard at least one plausible line/angle and replace it with inference or restraint.

VOICE:
Peer. Been there. Minimal. Confident. Culturally fluent.
If a line could be replaced by “I know,” cut it.

MUST-SAY ENFORCEMENT:
- Must appear verbatim.
- Land late enough to be heard.
- No exceptions.

OUTPUT FORMAT (ONLY THIS):
Finished radio script only. No preamble. No notes. No alternatives.
`;

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

function safeStr(v) {
  return typeof v === "string" ? v.trim() : "";
}

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
    const duration = pickDuration(body);

    const brand = safeStr(body?.brand) || safeStr(body?.property) || "";
    const audience = safeStr(body?.audience) || "";
    const mustSay = safeStr(body?.mustSay) || "NONE";
    const details =
      safeStr(body?.details) ||
      safeStr(body?.text) ||
      safeStr(body?.input) ||
      safeStr(body?.prompt) ||
      "";

    const prompt = `${DEX_RADIO_NODE}

DURATION: :${duration}
AUDIENCE: ${audience}
BRAND / PROPERTY: ${brand}
MUST-SAY: ${mustSay}
DETAILS: ${details}
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

    return NextResponse.json({ ok: true, output: String(output).trim() });
  } catch (_err) {
    return NextResponse.json(
      { ok: false, error: "DEX-RADIO generation failed" },
      { status: 500 }
    );
  }
}
