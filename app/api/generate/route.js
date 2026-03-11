import { NextResponse } from "next/server";

export const runtime = "nodejs";

const VERSION = "[[DEX_RADIO_STORY_ENGINE]]";

function s(v) {
  return typeof v === "string" ? v.trim() : "";
}

function pickDuration(body) {
  const d = body?.mode ?? body?.duration ?? body?.seconds;
  const n = Number(d);
  if (n === 15 || n === 30 || n === 60) return n;
  return 30;
}

function lines(text) {
  return s(text)
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function ensurePeriod(text) {
  const t = s(text);
  if (!t) return "";
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

function ensureMustSay(script, mustSay) {
  const ms = s(mustSay);
  if (!ms) return script;

  return `${script}\n${ms}`;
}

/* ------------------------
   STORY GENERATOR
-------------------------*/

function act1Scene(brand, audience) {
  const options = [
    `You know that moment when you realize the day just got better`,
    `Some days just need a place to land`,
    `Every city has that one spot`,
    `Here’s how a good day usually starts`,
  ];

  const base = options[Math.floor(Math.random() * options.length)];

  if (audience) return `${base} for ${audience}`;
  return base;
}

function act2Turn(offer, details) {
  const d = lines(details)[0];

  if (offer && d) return `${offer}. ${d}`;
  if (offer) return offer;
  if (d) return d;

  return "That’s where things get interesting";
}

function act3Resolution(brand, cta) {
  if (cta) return cta;

  return `That’s ${brand}`;
}

/* ------------------------
   LENGTH STRUCTURES
-------------------------*/

function build15({ brand, offer, audience, cta, details }) {
  const a1 = act1Scene(brand, audience);
  const a2 = act2Turn(offer, details);
  const a3 = act3Resolution(brand, cta);

  return [a1, a2, a3].map(ensurePeriod).join("\n");
}

function build30({ brand, offer, audience, cta, details }) {
  const a1 = act1Scene(brand, audience);
  const a2 = act2Turn(offer, details);
  const a3 = act3Resolution(brand, cta);

  const extra = lines(details)[1];

  const out = [a1];

  if (a2) out.push(a2);
  if (extra) out.push(extra);
  out.push(a3);

  return out.map(ensurePeriod).join("\n");
}

function build60({ brand, offer, audience, cta, details }) {
  const d = lines(details);

  const a1 = act1Scene(brand, audience);
  const a2 = act2Turn(offer, details);
  const a3 = act3Resolution(brand, cta);

  const out = [a1];

  if (a2) out.push(a2);

  for (let i = 0; i < Math.min(d.length, 3); i++) {
    out.push(d[i]);
  }

  out.push(a3);

  return out.map(ensurePeriod).join("\n");
}

/* ------------------------
   API ROUTE
-------------------------*/

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const duration = pickDuration(body);

    const brand = s(body.brand) || "YOUR BRAND";
    const offer = s(body.offer);
    const audience = s(body.audience);
    const cta = s(body.cta);
    const mustSay = s(body.mustSay);
    const details = s(body.details || body.text);

    let script =
      duration === 15
        ? build15({ brand, offer, audience, cta, details })
        : duration === 30
        ? build30({ brand, offer, audience, cta, details })
        : build60({ brand, offer, audience, cta, details });

    script = ensureMustSay(script, mustSay);

    return NextResponse.json({
      ok: true,
      output: script,
      meta: { duration, version: VERSION },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
