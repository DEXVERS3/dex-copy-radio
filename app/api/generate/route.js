import { NextResponse } from "next/server";

export const runtime = "nodejs";

const VERSION = "[[DEX_ENGINE_ARC_V1]]";

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

function lines(text) {
  return s(text)
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function unique(arr) {
  const seen = new Set();
  const out = [];

  for (const item of arr) {
    const t = s(item);
    const key = t.toLowerCase();
    if (!t || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }

  return out;
}

function ensurePeriod(t) {
  const x = s(t);
  if (!x) return "";
  return /[.!?]$/.test(x) ? x : `${x}.`;
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
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/festival|fair|concert|event|music|games|rides|tickets|petting zoo/.test(blob))
    return "invitation";

  return "generic";
}

function subject(input) {
  return s(input.brand) || s(input.offer) || "the event";
}

function speakable(line) {
  const l = s(line).toLowerCase();

  if (l === "kids under 8 ride free") return "Kids under eight ride free";
  if (l === "live music") return "Live music";
  if (l === "greek food") return "Greek food";
  if (l === "crafts") return "Crafts";
  if (l === "games") return "Games";
  if (l === "petting zoo") return "Petting zoo";
  if (l === "church fairgrounds") return "At the church fairgrounds";

  return s(line);
}

function details(input) {
  return unique(lines(input.details)).map(speakable);
}

function opening(subject) {
  return pick([
    `This is your invitation to ${subject}`,
    `${subject} is one of those events you do not want to miss`,
    `You can feel certain weekends coming before they get here. ${subject} is one of them`,
  ]);
}

function act2(details) {
  const out = [];

  if (details.length >= 3) {
    out.push(`${details[0]}, ${details[1]} and ${details[2]}`);
  } else if (details[0]) {
    out.push(details[0]);
  }

  if (details[3]) out.push(details[3]);
  if (details[4]) out.push(details[4]);
  if (details[5]) out.push(details[5]);

  return out;
}

function act3(subject) {
  const reactions = [
    "That sounds like a pretty good weekend",
    "Yeah… that will do it",
    "That is a good way to spend a day",
    "Now that sounds like a plan",
    "That is the kind of weekend people look forward to",
  ];

  return pick([
    pick(reactions),
    `That is what makes ${subject} worth the trip`,
    `That is why people make time for ${subject}`,
  ]);
}

function closing(subject, input) {
  const cta = s(input.cta);
  if (cta) return cta;
  return `Visit ${subject}`;
}

function fillers() {
  return [
    "Bring the family",
    "Make plans now",
    "There is something for everybody",
    "This is one of those weekends",
    "You do not want to miss this one",
    "A lot is waiting for you there",
  ];
}

function expand(base, duration) {
  const target = TARGET_LINES[duration];
  const f = fillers();

  const script = [...base];

  for (const line of f) {
    if (script.length >= target.min) break;
    if (!script.includes(line)) script.push(line);
  }

  return script.slice(0, target.max);
}

function buildScript(input, duration) {
  const sub = subject(input);
  const det = details(input);

  const act1 = [opening(sub)];

  if (input.offer) act1.push(s(input.offer));

  const actTwo = act2(det);

  const actThree = [
    act3(sub),
    closing(sub, input),
  ];

  let script = [...act1, ...actTwo, ...actThree];

  script = expand(script, duration);

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

    const script = buildScript(input, duration);

    return NextResponse.json({
      ok: true,
      output: script,
      meta: {
        duration,
        situation: detectSituation(input),
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
