import { NextResponse } from "next/server";

export const runtime = "nodejs";

const VERSION = "[[DEX_RADIO_GOVERNED_ENGINE_V2]]";

function s(v) {
  return typeof v === "string" ? v.trim() : "";
}

function pickDuration(body) {
  const n = Number(body?.mode ?? body?.duration ?? body?.seconds);
  return [15, 30, 60].includes(n) ? n : 30;
}

function isWeakOffer(offer) {
  const o = s(offer).toLowerCase();
  return (
    !o ||
    o.includes("we are plumber") ||
    o.includes("we do plumbing") ||
    o === "plumbing" ||
    o === "plumber" ||
    o === "services" ||
    o.length < 18
  );
}

function governedOffer({ brand, offer, details }) {
  if (!isWeakOffer(offer)) return offer;
  if (details) return details;

  if (brand.toLowerCase().includes("plumb")) {
    return "fast help for leaks, clogs, repairs, and plumbing problems that never wait for a convenient time";
  }

  return "clear help, real value, and a reason to act now";
}

function governedCTA({ brand, cta }) {
  return cta || `Call ${brand} today.`;
}

function build15({ brand, offer, audience, cta, details }) {
  const benefit = governedOffer({ brand, offer, details });
  const close = governedCTA({ brand, cta });

  return [
    audience
      ? `When ${audience} need the problem handled, ${brand} is ready.`
      : `When the problem needs handling, ${brand} is ready.`,
    benefit + ".",
    close,
  ].join("\n");
}

function build30({ brand, offer, audience, cta, details }) {
  const benefit = governedOffer({ brand, offer, details });
  const close = governedCTA({ brand, cta });

  return [
    `Some problems do not get better by waiting.`,
    audience
      ? `For ${audience}, ${brand} keeps it simple.`
      : `${brand} keeps it simple.`,
    benefit + ".",
    `No clutter. No pressure. Just the help you called for.`,
    close,
  ].join("\n");
}

function build60({ brand, offer, audience, cta, details }) {
  const benefit = governedOffer({ brand, offer, details });
  const close = governedCTA({ brand, cta });

  return [
    `Most people wait a little longer than they should.`,
    audience
      ? `For ${audience}, that is usually when the right call gets obvious.`
      : `That is usually when the right call gets obvious.`,
    `${brand} is there with ${benefit}.`,
    `Straightforward help. Clear next step. No wasted time.`,
    close,
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

    let output =
      duration === 15
        ? build15({ brand, offer, audience, cta, details })
        : duration === 30
        ? build30({ brand, offer, audience, cta, details })
        : build60({ brand, offer, audience, cta, details });

    if (mustSay) output += `\n${mustSay}`;

    return NextResponse.json({
      ok: true,
      output,
      meta: {
        duration,
        version: VERSION,
        governor: "input-quality-v2",
        weakOfferDetected: isWeakOffer(offer),
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
