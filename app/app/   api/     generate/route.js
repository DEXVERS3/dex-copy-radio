import { NextResponse } from "next/server";

export const runtime = "nodejs";

const VERSION = "[[DEX_DEMO_MODE_V1_FREE]]";

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

function pick(arr, idx) {
  return arr[Math.abs(idx) % arr.length];
}

function linesToBullets(text) {
  return s(text)
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function buildPromptBits({ brand, offer, cta, mustSay, details }) {
  const detailBits = linesToBullets(details);
  // If user gives sparse details, we still generate angles
  const extras =
    detailBits.length > 0
      ? detailBits
      : [
          "Walk in, get it done, keep moving.",
          "No appointment drama.",
          "Fast, clean, and straightforward.",
        ];

  return { detailBits: extras, mustSay: s(mustSay), brand, offer, cta };
}

function ensureMustSay(script, mustSay) {
  const ms = s(mustSay);
  if (!ms) return script.trim();
  // Put must-say as final line exactly once.
  const esc = ms.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(esc, "gi");
  let out = script.replace(re, "").replace(/\n{3,}/g, "\n\n").trim();
  return `${out}\n${ms}`.trim();
}

function make15({ brand, offer, cta, detailBits }) {
  // One beat, punch + CTA
  const hook = pick(
    [
      `You don’t have time for the “all day” oil change.`,
      `If your oil change takes longer than your coffee, something’s wrong.`,
      `Busy day? Good. Don’t waste it on an oil change.`,
    ],
    brand.length + offer.length
  );

  const punch = pick(
    [
      `${brand} gets you in and out — ${offer}.`,
      `${brand}. ${offer}. In. Out. Done.`,
      `${offer}. That’s the whole point. That’s ${brand}.`,
    ],
    offer.length
  );

  const close = pick(
    [
      `${cta || `Swing by ${brand} today`}.`,
      `${cta || `Stop at ${brand} and keep moving`}.`,
      `${cta || `Head to ${brand} — today`}.`,
    ],
    (cta || "").length + 3
  );

  const detail = pick(detailBits, 1);
  return [hook, punch, detail, close].join("\n");
}

function make30({ brand, offer, cta, detailBits }) {
  // Two beats: recognition → payoff/authority
  const beat1 = pick(
    [
      `You know that feeling when you realize your oil’s overdue… and you immediately regret it?`,
      `Your car doesn’t need a “someday.” It needs an oil change.`,
      `If you’ve been putting it off, this is the painless fix.`,
    ],
    brand.length
  );

  const beat2 = pick(
    [
      `${brand} makes it simple: ${offer}.`,
      `At ${brand}, it’s quick, clean, and done: ${offer}.`,
      `${offer}. That’s what ${brand} is built for.`,
    ],
    offer.length + 2
  );

  const proof = pick(
    [
      `No long wait. No weird upsell energy. Just get it handled.`,
      `You’re not there to hang out — you’re there to get back to your life.`,
      `It’s the fastest check-off on your whole list today.`,
    ],
    detailBits.join("").length
  );

  const detail = pick(detailBits, 2);

  const close = pick(
    [
      `${cta || `Get to ${brand} today`}.`,
      `${cta || `Visit ${brand} and knock it out`}.`,
      `${cta || `Stop by ${brand} — today`}.`,
    ],
    (cta || "").length + 7
  );

  return [beat1, beat2, proof, detail, close].join("\n");
}

function make60({ brand, offer, cta, detailBits }) {
  // Scene → escalation → belonging
  const scene = pick(
    [
      `Picture your day for a second. You’re already behind, your phone’s blowing up, and your car’s reminding you the oil change is overdue.`,
      `It’s one of those days. Meetings, errands, and your car hits you with the little reminder you’ve been avoiding.`,
      `You’ve got places to be, and the last thing you need is a half-day oil change saga.`,
    ],
    brand.length + 10
  );

  const escalation = pick(
    [
      `Here’s the move: ${brand}. ${offer}.`,
      `Don’t turn it into a project. Go to ${brand}. ${offer}.`,
      `${offer}. That’s why people hit ${brand} when they’re not trying to waste a day.`,
    ],
    offer.length + 11
  );

  const belonging = pick(
    [
      `This is the spot for people who want it done right — and done fast.`,
      `It’s for people who don’t need the speech. Just the fix.`,
      `You’ll feel it: quick in, quick out, back to your life.`,
    ],
    detailBits.join("|").length + 5
  );

  const detailA = pick(detailBits, 3);
  const detailB = pick(detailBits, 4);

  const close = pick(
    [
      `${cta || `Head to ${brand} today`}.`,
      `${cta || `Visit ${brand} — today`}.`,
      `${cta || `Stop by ${brand} and keep moving`}.`,
    ],
    (cta || "").length + 13
  );

  return [scene, escalation, belonging, detailA, detailB, close].join("\n");
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const duration = pickDuration(body);

    const brand = s(body.brand) || "YOUR BRAND";
    const offer = s(body.offer) || "YOUR OFFER";
    const cta = s(body.cta);
    const mustSay = s(body.mustSay);
    const details = s(body.details || body.text);

    const bits = buildPromptBits({ brand, offer, cta, mustSay, details });

    let script = "";
    if (duration === 15) script = make15({ ...bits, brand, offer, cta });
    if (duration === 30) script = make30({ ...bits, brand, offer, cta });
    if (duration === 60) script = make60({ ...bits, brand, offer, cta });

    script = ensureMustSay(script, mustSay);

    return NextResponse.json({
      ok: true,
      output: `${VERSION}\n${script}`.trim(),
      meta: { duration, version: VERSION },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
