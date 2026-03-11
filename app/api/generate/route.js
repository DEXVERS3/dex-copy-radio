import { NextResponse } from "next/server";

export const runtime = "nodejs";

const VERSION = "[[DEX_RADIO_CONVERSATION_ENGINE]]";

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

const SITUATIONS = [
  "Sooner or later the weekend turns into a hunt for a deal",
  "You know the moment when a good idea suddenly shows up",
  "Some problems eventually solve themselves",
  "Right about the time the day starts dragging",
  "Funny how the right move usually appears when you need it"
];

function buildSituation() {
  return pick(SITUATIONS);
}

const STORY_BEATS = [
  "reaction",
  "problem",
  "explanation",
  "aside",
  "reinforcement",
  "punchline"
];

function buildBeat(type, brand) {

  if (type === "reaction") {
    return pick([
      "You know the feeling",
      "Yeah… that will do it",
      "Right about now it starts making sense"
    ]);
  }

  if (type === "problem") {
    return pick([
      "Funny how ignoring the problem stops working",
      "Sooner or later it catches up",
      "Turns out that was not the best plan"
    ]);
  }

  if (type === "explanation") {
    return `Which is why people end up at ${brand}`;
  }

  if (type === "aside") {
    return pick([
      "Look… we have all been there",
      "You know exactly what I mean",
      "Anyway…"
    ]);
  }

  if (type === "reinforcement") {
    return pick([
      "That usually does the trick",
      "Now we are getting somewhere",
      "That is the idea"
    ]);
  }

  if (type === "punchline") {
    return pick([
      "Yeah… that will do it",
      "Problem solved",
      "Exactly"
    ]);
  }

  return "";
}

function numberToWords(n) {

  const small = [
    "zero","one","two","three","four","five","six","seven","eight","nine",
    "ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen",
    "seventeen","eighteen","nineteen"
  ];

  const tens = [
    "","","twenty","thirty","forty","fifty",
    "sixty","seventy","eighty","ninety"
  ];

  n = Number(n);

  if (n < 20) return small[n];

  if (n < 100) {
    return tens[Math.floor(n / 10)] +
      (n % 10 ? "-" + small[n % 10] : "");
  }

  if (n < 1000) {
    return (
      small[Math.floor(n / 100)] +
      " hundred" +
      (n % 100 ? " " + numberToWords(n % 100) : "")
    );
  }

  return String(n);
}

function formatBroadcastCopy(text) {

  let out = s(text);

  out = out.replace(/\$([0-9]+)/g, (_, dollars) => {
    return `${numberToWords(dollars)} dollars`;
  });

  out = out.replace(/\b([0-9]+)%/g, (_, n) => {
    return `${numberToWords(n)} percent`;
  });

  out = out.replace(/\b([0-9]{1,2})\s?(am|pm)/gi, (_, h, ap) => {
    return `${numberToWords(h)} ${ap === "am" ? "a m" : "p m"}`;
  });

  out = out.replace(/\s{2,}/g, " ").trim();

  return out;
}

function build15(input) {

  const situation = buildSituation();

  const beats = shuffle(STORY_BEATS)
    .slice(0,2)
    .map(b => buildBeat(b,input.brand));

  const offer = input.offer ? [input.offer] : [];
  const cta = input.cta ? [input.cta] : [input.brand];

  const script = [
    situation,
    ...beats,
    ...offer,
    ...cta
  ];

  return uniqueLines(script)
    .map(ensurePeriod)
    .join("\n");
}

function build30(input) {

  const situation = buildSituation();

  const beats = shuffle(STORY_BEATS)
    .slice(0,3)
    .map(b => buildBeat(b,input.brand));

  const offer = input.offer ? [input.offer] : [];
  const details = uniqueLines(lines(input.details)).slice(0,2);
  const cta = input.cta ? [input.cta] : [input.brand];

  const pool = shuffle([
    ...beats,
    ...offer,
    ...details,
    ...cta
  ]);

  const script = [
    situation,
    ...pool
  ];

  return uniqueLines(script)
    .map(ensurePeriod)
    .join("\n");
}

function build60(input) {

  const situation = buildSituation();

  const beats = shuffle(STORY_BEATS)
    .slice(0,4)
    .map(b => buildBeat(b,input.brand));

  const offer = input.offer ? [input.offer] : [];
  const details = uniqueLines(lines(input.details)).slice(0,4);
  const cta = input.cta ? [input.cta] : [input.brand];

  const pool = shuffle([
    ...beats,
    ...offer,
    ...details,
    ...cta
  ]);

  const script = [
    situation,
    ...pool
  ];

  return uniqueLines(script)
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
      details: s(body.details || body.text)
    };

    let script;

    if (duration === 15) script = build15(input);
    else if (duration === 60) script = build60(input);
    else script = build30(input);

    script = formatBroadcastCopy(script);

    return NextResponse.json({
      ok: true,
      output: script,
      meta: { duration, version: VERSION }
    });

  } catch {

    return NextResponse.json(
      { ok:false,error:"Server error"},
      { status:500 }
    );
  }
}
