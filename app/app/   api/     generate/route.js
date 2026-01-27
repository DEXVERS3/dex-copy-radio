import { NextResponse } from "next/server";

export const runtime = "nodejs";
const VERSION = "[[DEX_DEMO_MODE_V2_CLEAN]]";

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

function lines(text) {
  return s(text)
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function pick(arr, seed) {
  return arr[Math.abs(seed) % arr.length];
}

function stripLabelsEverywhere(text) {
  // Remove ANY label-like lines and inline "LABEL: ..."
  const raw = (text || "").split("\n");
  const out = [];
  for (let line of raw) {
    // drop whole line if it begins with a label
    if (/^\s*(DEX\s*RADIO|BRAND|OFFER|CTA|MUST-?SAY|DETAILS)\s*:/i.test(line)) continue;

    // remove inline labels like "OFFER: xyz"
    line = line.replace(/\b(DEX\s*RADIO|BRAND|OFFER|CTA|MUST-?SAY|DETAILS)\s*:\s*/gi, "");

    // collapse extra spaces
    line = line.replace(/\s{2,}/g, " ").trim();
    if (line) out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function ensureMustSayFinalLine(script, mustSay) {
  const ms = s(mustSay);
  if (!ms) return script.trim();

  // remove any existing occurrences (case-insensitive)
  const esc = ms.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(esc, "gi");
  let out = (script || "").replace(re, "").replace(/\n{3,}/g, "\n\n").trim();

  // must-say as FINAL line, verbatim
  return `${out}\n${ms}`.trim();
}

function buildDetailBits(details) {
  const bits = lines(details);
  return bits.length
    ? bits
    : [
        "Walk in, get it done, keep moving.",
        "No appointment drama.",
        "Fast, clean, and straightforward.",
      ];
}

function make15({ brand, offer, cta, detailBits, seed }) {
  const hook = pick(
    [
      "If your oil change takes longer than your coffee, something’s wrong.",
      "Busy day? Good. Don’t waste it on an oil change.",
      "You’ve got ten minutes. That’s enough to handle this.",
    ],
    seed
  );

  const punch = pick(
    [
      `${brand}. ${offer}. In. Out. Done.`,
      `${offer}. That’s the whole point. That’s ${brand}.`,
      `${brand} gets you back on the road — ${offer}.`,
    ],
    seed + 3
  );

  const detail = pick(detailBits, seed + 7);

  const close = pick(
    [
      `${cta || `Visit ${brand} today`}.`,
      `${cta || `Stop by ${brand} today`}.`,
      `${cta || `Head to ${brand} today`}.`,
    ],
    seed + 11
  );

  return [hook, punch, detail, close].join("\n");
}

function make30({ brand, offer, cta, detailBits, seed }) {
  const beat1 = pick(
    [
      "You know that moment you realize your oil’s overdue… and you immediately regret it?",
      "If you’ve been putting it off, this is the painless fix.",
      "Your car doesn’t need a “someday.” It needs an oil change.",
    ],
    seed
  );

  const beat2 = pick(
    [
      `${brand} makes it simple: ${offer}.`,
      `At ${brand}, it’s quick, clean, and done: ${offer}.`,
      `${offer}. That’s what ${brand} is built for.`,
    ],
    seed + 2
  );

  const proof = pick(
    [
      "No long wait. No weird upsell energy. Just get it handled.",
      "You’re not there to hang out — you’re there to get back to your life.",
      "This is the fastest check-off on your list today.",
    ],
    seed + 5
  );

  const detail = pick(detailBits, seed + 9);

  const close = pick(
    [
      `${cta || `Get to ${brand} today`}.`,
      `${cta || `Visit ${brand} today`}.`,
      `${cta || `Stop by ${brand} today`}.`,
    ],
    seed + 12
  );

  return [beat1, beat2, proof, detail, close].join("\n");
}

function make60({ brand, offer, cta, detailBits, seed }) {
  const scene = pick(
    [
      "Picture your day for a second. You’re already behind, your phone’s blowing up, and your car reminds you the oil change is overdue.",
      "It’s one of those days — errands, meetings, and your car hits you with the reminder you’ve been avoiding.",
      "You’ve got places to be, and the last thing you need is a half-day oil change saga.",
    ],
    seed
  );

  const escalation = pick(
    [
      `Here’s the move: ${brand}. ${offer}.`,
      `Don’t turn it into a project. Go to ${brand}. ${offer}.`,
      `${offer}. That’s why people hit ${brand} when they’re not trying to waste a day.`,
    ],
    seed + 3
  );

  const belonging = pick(
    [
      "This is the spot for people who want it done right — and done fast.",
      "It’s for people who don’t need the speech. Just the fix.",
      "Quick in, quick out, back to your life.",
    ],
    seed + 7
  );

  const a = pick(detailBits, seed + 10);
  const b = pick(detailBits, seed + 13);

  const close = pick(
    [
      `${cta || `Head to ${brand} today`}.`,
      `${cta || `Visit ${brand} today`}.`,
      `${cta || `Stop by ${brand} today`}.`,
    ],
    seed + 16
  );

  return [scene, escalation, belonging, a, b, close].join("\n");
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

    const detailBits = buildDetailBits(details);

    // stable seed so same intake -> consistent output per duration, but different across durations
    const seedBase =
      (brand.length * 7) +
      (offer.length * 11) +
      (cta.length * 13) +
      (details.length * 17) +
      (mustSay.length * 19);

    let script =
      duration === 15
        ? make15({ brand, offer, cta, detailBits, seed: seedBase + 15 })
        : duration === 30
        ? make30({ brand, offer, cta, detailBits, seed: seedBase + 30 })
        : make60({ brand, offer, cta, detailBits, seed: seedBase + 60 });

    script = stripLabelsEverywhere(script);
    script = ensureMustSayFinalLine(script, mustSay);

    return NextResponse.json({
      ok: true,
      output: `${VERSION}\n${script}`.trim(),
      meta: { duration, version: VERSION },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
