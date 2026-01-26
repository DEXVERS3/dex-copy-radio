import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
Before writing, silently infer:
- what the audience already knows
- what would insult them if explained
- what can be implied with silence
Any line that explains inferred knowledge is illegal.

OMISSION REQUIREMENT:
- Actively discard at least one plausible line or angle.
- Replace it with inference or restraint.

VOICE:
Peer. Been there. Minimal. Confident. Culturally fluent.
If a line could be replaced by “I know,” cut it.

MUST-SAY ENFORCEMENT:
- Must appear verbatim.
- Land late enough to be heard.
- No exceptions.

OUTPUT FORMAT (ONLY THIS):
- Finished radio script for the requested duration.
- No preamble. No notes. No alternatives.
`;

// -------------------- ROUTE --------------------
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));

    const duration =
      Number(body.duration) ||
      Number(body.seconds) ||
      Number(body.mode) ||
      30;

    const audience = body.audience || "";
    const brand = body.brand || body.property || "";
    const mustSay = body.mustSay || "NONE";
    const details = body.details || body.text || "";

    const prompt = `
${DEX_RADIO_NODE}

DURATION: :${duration}
AUDIENCE: ${audience}
BRAND / PROPERTY: ${brand}
MUST-SAY: ${mustSay}
DETAILS: ${details}
`;

    const response = await client.responses.create({
      model: "gpt-5.2",
      input: prompt,
    });

    const output =
      response.output_text ||
      response.output?.[0]?.content?.[0]?.text ||
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
