import { NextResponse } from "next/server";

export const runtime = "nodejs";

const VERSION = "[[DEX_RADIO_SCENARIO_ENGINE]]";

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

function uniqueLines(arr) {
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const key = s(item).toLowerCase();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s(item));
  }
  return out;
}

const SMALL = {
  0: "zero",
  1: "one",
  2: "two",
  3: "three",
  4: "four",
  5: "five",
  6: "six",
  7: "seven",
  8: "eight",
  9: "nine",
  10: "ten",
  11: "eleven",
  12: "twelve",
  13: "thirteen",
  14: "fourteen",
  15: "fifteen",
  16: "sixteen",
  17: "seventeen",
  18: "eighteen",
  19: "nineteen",
};

const TENS = {
  20: "twenty",
  30: "thirty",
  40: "forty",
  50: "fifty",
  60: "sixty",
  70: "seventy",
  80: "eighty",
  90: "ninety",
};

function numberToWords(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return String(n);

  if (num < 20) return SMALL[num];
  if (num < 100) {
    const tens = Math.floor(num / 10) * 10;
    const rest = num % 10;
    return rest ? `${TENS[tens]}-${SMALL[rest]}` : TENS[tens];
  }
  if (num < 1000) {
    const hundreds = Math.floor(num / 100);
    const rest = num % 100;
    return rest
      ? `${SMALL[hundreds]} hundred ${numberToWords(rest)}`
      : `${SMALL[hundreds]} hundred`;
  }
  if (num < 10000) {
    const thousands = Math.floor(num / 1000);
    const rest = num % 1000;
    return rest
      ? `${SMALL[thousands]} thousand ${numberToWords(rest)}`
      : `${SMALL[thousands]} thousand`;
  }

  return String(num)
    .split("")
    .map((d) => SMALL[Number(d)] || d)
    .join(" ");
}

function digitStringToWords(str) {
  return String(str)
    .split("")
    .map((ch) => (/\d/.test(ch) ? SMALL[Number(ch)] : ch))
    .join(" ");
}

function formatWebsiteDomain(domain) {
  const parts = String(domain).toLowerCase().split(".");
  return parts
    .map((part, index) => {
      if (index === 0) return part.split("").join(" ");
      return `dot ${part.split("").join(" ")}`;
    })
    .join(" ");
}

function formatBroadcastCopy(text) {
  let out = s(text);

  out = out.replace(/\b((?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+)\b/g, (_, domain) => {
    const cleaned = domain.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
    return formatWebsiteDomain(cleaned);
  });

  out = out.replace(/\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g, (_, a, b, c) => {
    return `${digitStringToWords(a)}, ${digitStringToWords(b)}, ${digitStringToWords(c)}`;
  });

  out = out.replace(/\$([0-9]+)\.([0-9]{2})\b/g, (_, dollars, cents) => {
    return `${numberToWords(Number(dollars))} dollars and ${numberToWords(Number(cents))} cents`;
  });

  out = out.replace(/\$([0-9]+)\b/g, (_, dollars) => {
    const d = Number(dollars);
    return d === 1 ? "one dollar" : `${numberToWords(d)} dollars`;
  });

  out = out.replace(/\b([0-9]+)%\b/g, (_, num) => {
    return `${numberToWords(Number(num))} percent`;
  });

  out = out.replace(/\b([0-9]+)-for-([0-9]+)\b/gi, (_, a, b) => {
    return `${numberToWords(Number(a))} for ${numberToWords(Number(b))}`;
  });

  out = out.replace(/\b([0-9]{1,2}):([0-9]{2})\s?(a\.?m\.?|p\.?m\.?)\b/gi, (_, h, m, ap) => {
    const hour = numberToWords(Number(h));
    const minuteNum = Number(m);
    const minute =
      minuteNum === 0
        ? ""
        : minuteNum < 10
        ? ` oh ${numberToWords(minuteNum)}`
        : ` ${numberToWords(minuteNum)}`;
    const suffix = /^a/i.test(ap) ? " a m" : " p m";
    return `${hour}${minute}${suffix}`;
  });

  out = out.replace(/\b([0-9]{1,2})\s?(a\.?m\.?|p\.?m\.?)\b/gi, (_, h, ap) => {
    const suffix = /^a/i.test(ap) ? "a m" : "p m";
    return `${numberToWords(Number(h))} ${suffix}`;
  });

  out = out.replace(/\s*;\s*/g, ". ");
  out = out.replace(/&/g, " and ");
  out = out.replace(/\s{2,}/g, " ").trim();

  return out;
}

function containsAny(text, words) {
  const hay = s(text).toLowerCase();
  return words.some((w) => hay.includes(w));
}

function buildContext({ brand, offer, audience, details, tone }) {
  const blob = [brand, offer, audience, details, tone].filter(Boolean).join(" ").toLowerCase();

  return {
    sports: containsAny(blob, [
      "eagles", "football", "nfl", "game", "gameday", "sports bar", "sunday ticket",
      "kickoff", "birds", "cowboys", "philly", "tailgate", "touchdown"
    ]),
    foodDrink: containsAny(blob, [
      "mimosa", "cider", "beer", "bar", "burger", "wings", "brunch", "drink", "cocktail", "happy hour"
    ]),
    auto: containsAny(blob, [
      "car", "truck", "lease", "dealer", "dealership", "oil", "service", "tires", "trade", "auto"
    ]),
    mattress: containsAny(blob, [
      "mattress", "sleep", "back relief", "back pain", "bed", "pillow", "spine", "couch"
    ]),
    retail: containsAny(blob, [
      "sale", "clearance", "weekend sale", "percent off", "discount", "shop", "store", "furniture"
    ]),
    event: containsAny(blob, [
      "concert", "show", "tickets", "event", "festival", "live music", "comedy"
    ]),
    loud: containsAny(blob, ["loud", "rowdy", "wild", "crazy", "party", "hype"]),
  };
}

function pickScenario({ brand, offer, audience, details, tone }) {
  const ctx = buildContext({ brand, offer, audience, details, tone });
  const d = lines(details);

  if (ctx.mattress) {
    return [
      "(yawn)",
      "I have been sleeping in the doghouse all week",
      "Turns out the couch is not built for a grown adult",
    ];
  }

  if (ctx.sports && ctx.foodDrink && ctx.loud) {
    return [
      "When the Birds kick off, this place gets loud",
      "Game day in here is not for the quiet crowd",
      "If you came for polite, you picked the wrong bar",
    ];
  }

  if (ctx.sports) {
    return [
      "When the game starts, the room changes",
      "Some places show the game. This place lives it",
      "If the Birds are on, you know where everybody ends up",
    ];
  }

  if (ctx.foodDrink) {
    return [
      "Some nights start the second somebody says one more round",
      "You know the kind of place where one drink turns into a story",
      "Some spots do food and drinks. Others do a night worth talking about",
    ];
  }

  if (ctx.auto) {
    return [
      "There comes a moment when your car tells on itself",
      "You can ignore a lot. Your car usually is not one of them",
      "That little sound, that light, that feeling. Yeah. It is time",
    ];
  }

  if (ctx.retail) {
    return [
      "There is a moment when full price starts feeling personal",
      "Sooner or later, the weekend turns into a hunt for a deal",
      "You know that second when you realize waiting cost you money",
    ];
  }

  if (ctx.event) {
    return [
      "When the lights go down, the excuses disappear",
      "Some nights are supposed to stay home. This is not one of them",
      "You can feel certain nights coming before they get here",
    ];
  }

  if (d.length && d[0].length < 70) {
    return [
      d[0],
      "That is where this story gets interesting",
      "And that is where the smart move shows up",
    ];
  }

  return [
    "You know that moment when the day suddenly gets more interesting",
    "Sometimes the whole plan changes with one good idea",
    "Funny how the right move usually shows up right when you need it",
  ];
}

function buildAct1(input) {
  const options = pickScenario(input);
  return options[Math.floor(Math.random() * options.length)];
}

function buildAct2({ brand, offer, details }) {
  const d = uniqueLines(lines(details));

  const out = [];

  if (offer) out.push(offer);

  for (const line of d.slice(0, 3)) {
    if (offer && s(line).toLowerCase() === s(offer).toLowerCase()) continue;
    out.push(line);
  }

  if (!out.length && brand) {
    out.push(`That is why people end up at ${brand}`);
  }

  return uniqueLines(out);
}

function buildAct3({ brand, cta, mustSay, details }) {
  const d = uniqueLines(lines(details));
  const out = [];

  if (cta) {
    out.push(cta);
  } else if (brand) {
    out.push(`That is ${brand}`);
  }

  const lastDetail = d[d.length - 1];
  if (lastDetail && !out.some((x) => s(x).toLowerCase() === s(lastDetail).toLowerCase())) {
    if (/[!?]$/.test(lastDetail) || lastDetail === lastDetail.toUpperCase()) {
      out.unshift(lastDetail);
    }
  }

  if (mustSay) out.push(mustSay);

  return uniqueLines(out);
}

function build15(input) {
  const act1 = buildAct1(input);
  const act2 = buildAct2(input)[0] || "";
  const act3 = buildAct3(input)[0] || input.cta || `That is ${input.brand}`;

  return uniqueLines([act1, act2, act3]).map(ensurePeriod).join("\n");
}

function build30(input) {
  const act1 = buildAct1(input);
  const act2 = buildAct2(input).slice(0, 2);
  const act3 = buildAct3(input).slice(0, 2);

  return uniqueLines([act1, ...act2, ...act3]).map(ensurePeriod).join("\n");
}

function build60(input) {
  const act1 = buildAct1(input);
  const act2 = buildAct2(input).slice(0, 3);
  const act3 = buildAct3(input).slice(0, 3);

  return uniqueLines([act1, ...act2, ...act3]).map(ensurePeriod).join("\n");
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

    let script =
      duration === 15
        ? build15(input)
        : duration === 30
        ? build30(input)
        : build60(input);

    script = formatBroadcastCopy(script);

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
}v
