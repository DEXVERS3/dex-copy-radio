import { NextResponse } from "next/server";

export const runtime = "nodejs";

const VERSION = "[[DEX_RADIO_GOVERNED_ENGINE_V1]]";

function s(v) {
  return typeof v === "string" ? v.trim() : "";
}

function pickDuration(body) {
  const n = Number(body?.mode ?? body?.duration ?? body?.seconds);
  return [15, 30, 60].includes(n) ? n : 30;
}

function weakOffer(offer) {
  const o = offer.toLowerCase();
  return (
    !offer ||
    o === "we do plumbing" ||
    o === "we are plumbers" ||
    o === "plumbing" ||
    o === "services" ||
    o.length < 14
  );
}

function buildOffer({ brand, offer, details }) {
  if (!weakOffer(offer)) return offer;

  if (details) return details;

  if (brand.toLowerCase().includes("plumb")) {
    return "fast help for leaks, clogs, repairs, and plumbing problems that never wait for a convenient time";
  }

  return "clear help, real value, and a reason to act now";
}

function buildCTA({ brand, cta }) {
  if (cta) return cta;
  return `Call ${brand} today.`;
}

function build15({ brand, offer, audience, cta, details }) {
  const realOffer = buildOffer({ brand, offer, details });
  const realCTA = buildCTA({ brand, cta });

  return [
    audience
      ? `When ${audience} need help that feels simple, ${brand} is ready.`
      : `When the problem can’t wait, ${brand} is ready.`,
    `${realOffer}.`,
    realCTA,
  ].join("\n");
}

function build30({ brand, offer, audience, cta, details }) {
  const realOffer = buildOffer({ brand, offer, details });
  const realCTA = buildCTA({ brand, cta });

  return [
    audience
      ? `${audience} do not need another sales pitch. They need the problem handled.`
      : `Nobody needs another sales pitch. They need the problem handled.`,
    `${brand} offers ${realOffer}.`,
    `Straightforward, useful, and built for the moment you actually need it.`,
    realCTA,
  ].join("\n");
}

function build60({ brand, offer, audience, cta, details }) {
  const realOffer = buildOffer({ brand, offer, details });
  const realCTA = buildCTA({ brand, cta });

  return [
    `Sooner or later, people remember who made the hard thing easier.`,
    audience
      ? `For ${audience}, that is where ${brand} comes in.`
      : `That is where ${brand} comes in.`,
    `${brand} offers ${realOffer}.`,
    `No clutter. No pressure. Just a clear solution when timing matters.`,
    realCTA,
  ].join("\n");
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const duration = pickDuration(body);

    const brand = s(body.brand) || "YOUR BRAND";
    const offer = s(body.offer);
    const audience = s(body.audience);
    const cta = s(body.cta);
   const details = s(body.details);
    const mustSay = s(body.mustSay);

    let script =
      duration === 15
        ? build15({ brand, offer, audience, cta, details })
        : duration === 30
        ? build30({ brand, offer, audience, cta, details })
        : build60({ brand, offer, audience, cta, details });

    if (mustSay) {
      script += `\n${mustSay}`;
    }

    return NextResponse.json({
      ok: true,
      output: script,
      meta: {
        duration,
        version: VERSION,
        governor: "input-quality-v1",
        weakOfferDetected: weakOffer(offer),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
