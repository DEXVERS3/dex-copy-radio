import { NextResponse } from "next/server";

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

INFERENCE GATE:
Anything that explains what the audience already knows is illegal.

VOICE:
Peer. Minimal. Confident. Culturally fluent.

OUTPUT FORMAT:
Finished radio script only.
`;

export async function POST(req) {
  try {
    const body = await req.json();

    const duration = body.duration || body.mode || 30;
    const audience = body.audience || "";
    const brand = body.brand || body.property || "";
    const mustSay = body.mustSay || "NONE";
    const details = body.details || "";

    const prompt = `
${DEX_RADIO_NODE}

DURATION: :${duration}
AUDIENCE: ${audience}
BRAND / PROPERTY: ${brand}
MUST-SAY: ${mustSay}
DETAILS: ${details}
`;

    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.2",
        input: prompt,
      }),
    });

    const data = await response.json();

    const output =
      data.output_text ||
      data.output?.[0]?.content?.[0]?.text ||
      "";

    return NextResponse.json({
      ok: true,
      output: output.trim(),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "DEX-RADIO generation failed" },
      { status: 500 }
    );
  }
}
