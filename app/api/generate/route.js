import { NextResponse } from "next/server";

export const runtime = "nodejs";
const VERSION = "[[DEX_RADIO_V3_NEUTRAL_COPY]]";

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

function clean(text) {
  return s(text).replace(/\s+/g, " ").trim();
}

function ensurePeriod(text) {
  const t = clean(text);
  if (!t) return "";
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

function stripLabelsEverywhere(text) {
  const raw = (text || "").split("\n");
  const out = [];

  for (let line of raw) {
    if (/^\s*(DEX\s*RADIO|BRAND|OFFER|CTA|MUST-?SAY|DETAILS|AUDIENCE|TONE)\s*:/i.test(line)) continue;
    line = line.replace(/\b(DEX\s*RADIO|BRAND|OFFER|CTA|MUST-?SAY|DETAILS|AUDIENCE|TONE)\s*:\s*/gi, "");
    line = line.replace(/\s{2,}/g, " ").trim();
    if (line) out.push(line);
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function ensureMustSayFinalLine(script, mustSay) {
  const ms = s(mustSay);
  if (!ms) return script.trim();

  const esc = ms.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(esc, "gi");
  let out = (script || "").replace(re, "").replace(/\n{3,}/g, "\n\n").trim();

  return `${out}\n${ms}`.trim();
}

function makeDetailBits(details) {
  return lines(details).map(ensurePeriod).filter(Boolean);
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function build15({ brand, offer, cta, details }) {
  const out = [];

  if (offer) out.push(ensurePeriod(`${brand} has ${offer}`));
  else out.push(ensurePeriod(`${brand}`));

  if (details[0]) out.push(details[0]);

  if (cta) out.push(ensurePeriod(cta));
  else out.push(ensurePeriod(`Visit ${brand} today`));

  return unique(out).join("\n");
}

function build30({ brand, offer, audience, cta, details }) {
  const out = [];

  if (offer) out.push(ensurePeriod(`${brand} has ${offer}`));
  else out.push(ensurePeriod(`${brand} is on now`));

  if (audience) out.push(ensurePeriod(`For ${audience}`));

  if (details[0]) out.push(details[0]);
  if (details[1]) out.push(details[1]);

  if (cta) out.push(ensurePeriod(cta));
  else out.push(ensurePeriod(`Get to ${brand} today`));

  return unique(out).join("\n");
}

function build60({ brand, offer, audience, cta, details }) {
  const out = [];

  if (offer) out.push(ensurePeriod(`At ${brand}, here is the offer: ${offer}`));
  else out.push(ensurePeriod(`${brand} is ready`));

  if (audience) out.push(ensurePeriod(`Built for ${audience}`));

  for (const d of details.slice(0, 4)) {
    out.push(d);
  }

  if (cta) out.push(ensurePeriod(cta));
  else out.push(ensurePeriod(`Visit ${brand} today`));

  return unique(out).join("\n");
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const duration = pickDuration(body);

    const brand = s(body.brand) || "YOUR BRAND";
    const offer = s(body.offer);
    const audience = s(body.audience);
    const cta = s(body.cta);
    const mustSay = s(body.mustSay);
    const details = makeDetailBits(body.details || body.text);

    let script =
      duration === 15
        ? build15({ brand, offer, cta, details })
        : duration === 30
        ? build30({ brand, offer, audience, cta, details })
        : build60({ brand, offer, audience, cta, details });

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
