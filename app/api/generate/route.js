import { NextResponse } from "next/server";

export const runtime = "nodejs";

const VERSION = "[[DEX_ENGINE_3ACT_SUBJECT_CONTROL_V1]]";

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
    input.cta,
    input.mustSay,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/festival|fair|concert|event|music|rides|games|tickets|show|petting zoo/.test(blob))
    return "invitation";

  if (/repair|broken|fix|injury|bail|lawyer|emergency/.test(blob))
    return "repair";

  if (/service|utility|insurance|plan|provider/.test(blob))
    return "maintenance";

  if (/upgrade|remodel|cosmetic|furniture|mattress|improve/.test(blob))
    return "improvement";

  return "experience";
}

function inferSubject(input) {
  return s(input.brand) || s(input.offer) || "the event";
}

function speakableDetail(line) {
  const raw = s(line);
  if (!raw) return "";

  const lower = raw.toLowerCase();

  if (lower === "kids under 8 ride free") return "Kids under eight ride free";
  if (lower === "live music") return "Live music";
  if (lower === "greek food") return "Greek food";
  if (lower === "crafts") return "Crafts";
  if (lower === "games") return "Games";
  if (lower === "petting zoo") return "Petting zoo";
  if (lower === "church fairgrounds") return "At the church fairgrounds";

  return raw;
}

function buildDetails(input) {
  return uniqueLines(lines(input.details)).map(speakableDetail);
}

function openingLine(subject, situation) {
  if (situation === "invitation") {
    return pick([
      `This is your invitation to ${subject}`,
      `${subject} is one of those events you do not want to miss`,
      `You can feel certain weekends coming before they get here. ${subject} is one of them`,
    ]);
  }

  return pick([
    `Sometimes the right move shows up when you need it`,
    `${subject} has a way of getting your attention`,
  ]);
}

function closingLine(subject, input) {
  const cta = s(input.cta);
  if (cta) return cta;

  return `Visit ${subject}`;
}

function buildAct2(details) {
  const out = [];

  if (details.length === 0) return out;

  if (details.length >= 3) {
    out.push(`${details[0]}, ${details[1]} and ${details[2]}`);
  } else {
    out.push(details[0]);
  }

  if (details[3]) out.push(details[3]);
  if (details[4]) out.push(details[4]);
  if (details[5]) out.push(details[5]);

  return out;
}

function expandToTarget(base, duration) {
  const target = TARGET_LINES[duration];

  let script = uniqueLines(base);

  const filler = [
    "Bring the family",
    "Make plans now",
    "There is something for everybody",
    "This is one of those weekends",
    "You do not want to miss this one",
  ];

  while (script.length < target.min) {
    const line = pick(filler);
    if (!script.includes(line)) script.push(line);
  }

  return script.slice(0, target.max);
}

function buildScript(input, situation, duration) {
  const subject = inferSubject(input);
  const details = buildDetails(input);

  const act1 = [];
  const act2 = [];
  const act3 = [];

  act1.push(openingLine(subject, situation));

  if (input.offer) act1.push(s(input.offer));

  act2.push(...buildAct2(details));

  act3.push(closingLine(subject, input));

  let script = [...act1, ...act2, ...act3];

  script = expandToTarget(script, duration);

  return script.map(ensurePeriod).join("\n");
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

    const script = buildScript(input, situation, duration);

    return NextResponse.json({
      ok: true,
      output: script,
      meta: {
        duration,
        situation,
        version: VERSION,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
