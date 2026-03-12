import { NextResponse } from "next/server";

export const runtime = "nodejs";

const VERSION = "[[DEX_RADIO_ENGINE_SITUATION_V1]]";

const TARGET_LINES = {
  15: { min: 5, max: 7 },
  30: { min: 9, max: 12 },
  60: { min: 17, max: 20 },
};

function s(v) {
  return typeof v === "string" ? v.trim() : "";
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  return [...arr].sort(() => 0.5 - Math.random());
}

function lines(text) {
  return s(text)
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function uniqueLines(arr) {
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const val = s(item);
    const key = val.toLowerCase();
    if (!val || seen.has(key)) continue;
    seen.add(key);
    out.push(val);
  }
  return out;
}

function ensurePeriod(text) {
  const t = s(text);
  if (!t) return "";
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

function pickDuration(body) {
  const d = body?.mode ?? body?.duration ?? body?.seconds;
  const n = Number(d);
  if (n === 15 || n === 30 || n === 60) return n;
  return 30;
}

function detectSituation(input) {
  const blob = [
    input.brand,
    input.offer,
    input.details,
    input.audience,
    input.cta,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const scores = {
    repair: 0,
    maintenance: 0,
    improvement: 0,
    experience: 0,
    invitation: 0,
  };

  if (/repair|broken|emergency|bail|accident|injury|fix/.test(blob)) scores.repair += 3;
  if (/service|reliable|provider|plan|utility|power|water|gas/.test(blob)) scores.maintenance += 2;
  if (/upgrade|new|remodel|cosmetic|improve|better/.test(blob)) scores.improvement += 2;
  if (/restaurant|bar|drink|dining|food|nightlife/.test(blob)) scores.experience += 2;
  if (/festival|fair|concert|event|tickets|music|show/.test(blob)) scores.invitation += 3;

  return Object.entries(scores).sort((a,b)=>b[1]-a[1])[0][0];
}

function openingLine(input, situation) {
  const brand = input.brand;

  if (situation === "repair") {
    return pick([
      "Sometimes trouble shows up faster than you expected",
      "When something breaks, the day usually follows",
      `That is when people call ${brand}`,
    ]);
  }

  if (situation === "maintenance") {
    return pick([
      "Most days you never think about it",
      "The best systems are the ones you never notice",
      `${brand} keeps things running the way they should`,
    ]);
  }

  if (situation === "improvement") {
    return pick([
      "Sooner or later the room starts telling on itself",
      "Sometimes the upgrade becomes obvious",
      `That is where ${brand} comes in`,
    ]);
  }

  if (situation === "experience") {
    return pick([
      "Some nights start the moment someone says let's go",
      "You know the kind of place where the night writes itself",
      `${brand} is that kind of place`,
    ]);
  }

  if (situation === "invitation") {
    return pick([
      "Some weekends announce themselves",
      "You can feel certain events coming before they arrive",
      `That weekend is ${brand}`,
    ]);
  }

  return pick([
    "Funny how the right move usually appears when you need it",
    "Sometimes the whole plan changes with one good idea",
  ]);
}

function buildCoreLines(input) {
  const brand = input.brand;
  const offer = s(input.offer);
  const cta = s(input.cta) || brand;
  const details = uniqueLines(lines(input.details)).slice(0,6);

  const arr = [];

  if (offer) arr.push(offer);

  for (const d of details) arr.push(d);

  if (cta) arr.push(cta);

  return arr;
}

function expandToTarget(base, duration) {
  const target = TARGET_LINES[duration];
  let script = uniqueLines(base);

  const filler = [
    "You know the feeling",
    "That usually does the trick",
    "Now we are getting somewhere",
    "That is the idea",
    "Right about now it starts making sense",
  ];

  while (script.length < target.min) {
    script.push(pick(filler));
  }

  return script.slice(0, target.max);
}

function assembleScript(input, situation, duration) {
  const open = openingLine(input, situation);
  const core = buildCoreLines(input);

  const base = [open, ...shuffle(core)];

  return expandToTarget(base, duration)
    .map(ensurePeriod)
    .join("\n");
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const duration = pickDuration(body);

    const input = {
      brand: s(body.brand) || "YOUR BRAND",
      offer: s(body.offer),
      audience: s(body.audience),
      tone: s(body.tone),
      cta: s(body.cta),
      mustSay: s(body.mustSay),
      details: s(body.details || body.text),
    };

    const situation = detectSituation(input);

    const script = assembleScript(input, situation, duration);

    return NextResponse.json({
      ok: true,
      output: script,
      meta: {
        duration,
        situation,
        version: VERSION,
        lines: lines(script).length
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
