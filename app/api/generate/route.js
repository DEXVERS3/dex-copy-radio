import { NextResponse } from "next/server";

export const runtime = "nodejs";

const VERSION = "[[DEX_ENGINE_ARC_V4_GUARDRAILS_RESTORED]]";

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

function subject(input) {
  return s(input.brand) || s(input.offer) || "the event";
}

function lowerFirst(text) {
  const t = s(text);

  if (!t) return "";

  return t.charAt(0).toLowerCase() + t.slice(1);
}

function oxfordJoin(arr) {
  const a = arr.map(s).filter(Boolean);

  if (a.length === 0) return "";
  if (a.length === 1) return a[0];
  if (a.length === 2) return `${a[0]} and ${a[1]}`;

  return `${a.slice(0, -1).join(", ")}, and ${a[a.length - 1]}`;
}

function onesWord(n) {
  return [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
  ][n] || "";
}

function teenWord(n) {
  return [
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ][n - 10] || "";
}

function tensWord(n) {
  return [
    "",
    "",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
  ][n] || "";
}

function integerToWords(num) {
  const n = Number(num);

  if (!Number.isFinite(n)) return String(num);
  if (n < 0) return `minus ${integerToWords(Math.abs(n))}`;
  if (n < 10) return onesWord(n);
  if (n < 20) return teenWord(n);

  if (n < 100) {
    const tens = Math.floor(n / 10);
    const rem = n % 10;

    return rem ? `${tensWord(tens)}-${onesWord(rem)}` : tensWord(tens);
  }

  if (n < 1000) {
    const hundreds = Math.floor(n / 100);
    const rem = n % 100;

    return rem
      ? `${onesWord(hundreds)} hundred ${integerToWords(rem)}`
      : `${onesWord(hundreds)} hundred`;
  }

  if (n < 1000000) {
    const thousands = Math.floor(n / 1000);
    const rem = n % 1000;

    return rem
      ? `${integerToWords(thousands)} thousand ${integerToWords(rem)}`
      : `${integerToWords(thousands)} thousand`;
  }

  if (n < 1000000000) {
    const millions = Math.floor(n / 1000000);
    const rem = n % 1000000;

    return rem
      ? `${integerToWords(millions)} million ${integerToWords(rem)}`
      : `${integerToWords(millions)} million`;
  }

  return String(num);
}

function ordinalWord(n) {
  const map = {
    1: "first",
    2: "second",
    3: "third",
    4: "fourth",
    5: "fifth",
    6: "sixth",
    7: "seventh",
    8: "eighth",
    9: "ninth",
    10: "tenth",
    11: "eleventh",
    12: "twelfth",
    13: "thirteenth",
    14: "fourteenth",
    15: "fifteenth",
    16: "sixteenth",
    17: "seventeenth",
    18: "eighteenth",
    19: "nineteenth",
    20: "twentieth",
    21: "twenty-first",
    22: "twenty-second",
    23: "twenty-third",
    24: "twenty-fourth",
    25: "twenty-fifth",
    26: "twenty-sixth",
    27: "twenty-seventh",
    28: "twenty-eighth",
    29: "twenty-ninth",
    30: "thirtieth",
    31: "thirty-first",
  };

  return map[n] || integerToWords(n);
}

function monthNameToTitleCase(m) {
  const months = {
    january: "January",
    february: "February",
    march: "March",
    april: "April",
    may: "May",
    june: "June",
    july: "July",
    august: "August",
    september: "September",
    october: "October",
    november: "November",
    december: "December",
  };

  return months[m.toLowerCase()] || m;
}

function lettersSpaced(text) {
  return text
    .split("")
    .map((ch) => {
      if (/[a-z]/i.test(ch)) return ch.toLowerCase();
      return ch;
    })
    .join(" ");
}

function speakUrl(url) {
  let t = s(url).toLowerCase();

  t = t.replace(/^https?:\/\//, "");
  t = t.replace(/^www\./, "");

  const parts = t.split(".");
  if (parts.length < 2) return url;

  const domain = parts.shift() || "";
  const tail = parts.join(" dot ");

  return `${lettersSpaced(domain)} dot ${tail}`;
}

function speakMoneyToken(token) {
  const raw = token.replace(/,/g, "");
  const match = raw.match(/^\$(\d+)(?:\.(\d{1,2}))?$/);

  if (!match) return token;

  const dollars = Number(match[1]);
  const cents = match[2] ? Number(match[2].padEnd(2, "0")) : 0;

  if (dollars && cents) {
    return `${integerToWords(dollars)} dollars and ${integerToWords(cents)} cents`;
  }

  if (dollars) {
    return dollars === 1 ? "one dollar" : `${integerToWords(dollars)} dollars`;
  }

  if (cents) {
    return cents === 1 ? "one cent" : `${integerToWords(cents)} cents`;
  }

  return token;
}

function speakPlainNumberToken(token) {
  const raw = token.replace(/,/g, "");

  if (!/^\d+$/.test(raw)) return token;

  return integerToWords(Number(raw));
}

function speakTimeToken(token) {
  const raw = token.trim();

  let m = raw.match(/^(\d{1,2}):(\d{2})$/i);

  if (m) {
    const hour = Number(m[1]);
    const min = Number(m[2]);

    if (min === 0) return `${integerToWords(hour)} o'clock`;
    if (min < 10) return `${integerToWords(hour)} oh ${integerToWords(min)}`;

    return `${integerToWords(hour)} ${integerToWords(min)}`;
  }

  m = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)$/i);

  if (m) {
    const hour = Number(m[1]);
    const min = m[2] ? Number(m[2]) : null;
    const meridiem = /p/i.test(m[3]) ? "p m" : "a m";

    if (min === null) return `${integerToWords(hour)} ${meridiem}`;
    if (min === 0) return `${integerToWords(hour)} ${meridiem}`;
    if (min < 10) return `${integerToWords(hour)} oh ${integerToWords(min)} ${meridiem}`;

    return `${integerToWords(hour)} ${integerToWords(min)} ${meridiem}`;
  }

  return token;
}

function speakDateRanges(text) {
  let out = text;

  out = out.replace(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\s*[–-]\s*(\d{1,2})\b/gi,
    (_, month, a, b) =>
      `${monthNameToTitleCase(month)} ${ordinalWord(Number(a))} through ${ordinalWord(Number(b))}`
  );

  out = out.replace(
    /\b(\d{1,2})\s*[–-]\s*(\d{1,2})\s+(a\.?m\.?|p\.?m\.?)\b/gi,
    (_, a, b, meridiem) =>
      `${integerToWords(Number(a))} through ${integerToWords(Number(b))} ${/p/i.test(meridiem) ? "p m" : "a m"}`
  );

  return out;
}

function speakOrdinals(text) {
  return text.replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, (_, n) => ordinalWord(Number(n)));
}

function speakStandaloneTimes(text) {
  let out = text;

  out = out.replace(/\b\d{1,2}:\d{2}\s*(?:a\.?m\.?|p\.?m\.?)\b/gi, (m) => speakTimeToken(m));
  out = out.replace(/\b\d{1,2}:\d{2}\b/gi, (m) => speakTimeToken(m));
  out = out.replace(/\b\d{1,2}\s*(?:a\.?m\.?|p\.?m\.?)\b/gi, (m) => speakTimeToken(m));

  return out;
}

function speakUrls(text) {
  return text.replace(
    /\b((?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\.[a-z]{2,})?(?:\/[^\s]*)?)\b/gi,
    (m) => speakUrl(m)
  );
}

function speakMoney(text) {
  return text.replace(/\$\d[\d,]*(?:\.\d{1,2})?\b/g, (m) => speakMoneyToken(m));
}

function speakRemainingNumbers(text) {
  return text.replace(/\b\d[\d,]*\b/g, (m) => speakPlainNumberToken(m));
}

function normalizeAmpersands(text) {
  return text.replace(/\s*&\s*/g, " and ");
}

function speakable(line) {
  let out = s(line);
  const l = out.toLowerCase();

  if (l === "kids under 8 ride free") return "Kids under eight ride free";
  if (l === "live music") return "live music";
  if (l === "greek food") return "Greek food";
  if (l === "crafts") return "crafts";
  if (l === "games") return "games";
  if (l === "petting zoo") return "a petting zoo";

  out = normalizeAmpersands(out);
  out = speakUrls(out);
  out = speakDateRanges(out);
  out = speakOrdinals(out);
  out = speakMoney(out);
  out = speakStandaloneTimes(out);
  out = speakRemainingNumbers(out);

  return out;
}

function details(input) {
  return unique(lines(input.details)).map(speakable);
}

function buildDetailBuckets(det) {
  const buckets = {
    dates: [],
    specials: [],
    attractions: [],
    other: [],
  };

  for (const item of det) {
    const l = s(item).toLowerCase();

    if (
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(l) ||
      /\bthrough\b/.test(l)
    ) {
      buckets.dates.push(item);
      continue;
    }

    if (
      /\b(special performance|special guest|appearance by|featuring|plus)\b/.test(l)
    ) {
      buckets.specials.push(item);
      continue;
    }

    if (
      /\b(food|crafts|games|music|rides|vendors|activities|showroom|sectionals|furniture)\b/.test(l)
    ) {
      buckets.attractions.push(item);
      continue;
    }

    buckets.other.push(item);
  }

  return buckets;
}

function buildSupport(det) {
  if (!det.length) return "";

  const buckets = buildDetailBuckets(det);

  const parts = [];

  if (buckets.dates[0]) {
    parts.push(buckets.dates[0]);
  }

  if (buckets.attractions.length) {
    parts.push(oxfordJoin(buckets.attractions.slice(0, 4)));
  }

  if (buckets.specials[0]) {
    parts.push(`plus ${lowerFirst(buckets.specials[0])}`);
  }

  if (!parts.length && buckets.other.length) {
    parts.push(oxfordJoin(buckets.other.slice(0, 5)));
  }

  if (parts.length === 1) return parts[0];

  return `${parts[0]}, ${parts.slice(1).join(", ")}`;
}

function opening(sub, input, duration) {
  const offer = s(input.offer) ? speakable(s(input.offer)) : "";

  if (duration === 60 && offer) {
    return pick([
      `You can feel certain weekends coming before they get here.`,
      `${sub} is one of them, and ${offer.toLowerCase()}`,
    ]);
  }

  if (duration === 60) {
    return pick([
      `You can feel certain weekends coming before they get here.`,
      `${sub} is one of them.`,
    ]);
  }

  if (offer) {
    return [
      pick([
        `This is your invitation to ${sub}.`,
        `${sub} is one of those weekends people make room for.`,
      ]),
      `${offer}.`,
    ];
  }

  return [
    pick([
      `This is your invitation to ${sub}.`,
      `${sub} is one of those events people look forward to.`,
    ]),
  ];
}

function act3(sub) {
  const reactions = [
    "That sounds like a pretty good weekend",
    "That is the kind of weekend people look forward to",
    "That is not a bad way to spend a day",
    `That is why people make time for ${sub}`,
    `That is what makes ${sub} worth the trip`,
  ];

  return pick(reactions);
}

function closing(sub, input) {
  const cta = s(input.cta) ? speakable(s(input.cta)) : "";

  if (cta) return cta;

  return `Visit ${sub}`;
}

function invitationExpansion(sub, det) {
  const buckets = buildDetailBuckets(det);
  const out = [];

  out.push("Bring the family");
  out.push("Make plans now");
  out.push("This is one of those weekends");
  out.push("You do not want to miss this one");

  if (buckets.specials[0]) {
    out.push(`And yes — ${lowerFirst(buckets.specials[0])}`);
  }

  if (buckets.attractions.length >= 2) {
    out.push(`Food, music, and games have a way of filling up a day`);
  }

  if (buckets.dates[0]) {
    out.push(`Mark it down now`);
  }

  out.push(`That is how weekends like ${sub} earn a crowd`);

  return unique(out);
}

function genericExpansion(sub) {
  return unique([
    "Make plans now",
    "That gets hard to ignore",
    `That is why people make time for ${sub}`,
    `That is what puts ${sub} on the list`,
    "Once you hear that, the decision gets easier",
    "That usually does the job",
  ]);
}

function expansionCandidates(sub, input, det) {
  const blob = [input.brand, input.offer, input.details, input.cta]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/festival|fair|concert|event|games|music|rides|tickets|petting zoo/.test(blob)) {
    return invitationExpansion(sub, det);
  }

  return genericExpansion(sub);
}

function splitLine(line) {
  const t = s(line);

  if (!t) return [];

  const parts = t
    .split(/(?<=[.!?])\s+/)
    .map((x) => s(x))
    .filter(Boolean);

  return parts.length ? parts : [t];
}

function expand(base, duration, sub, input, det) {
  const target = TARGET_LINES[duration];
  const script = [...base];
  const extras = expansionCandidates(sub, input, det);

  for (const line of extras) {
    if (script.length >= target.min) break;
    if (!script.includes(line)) {
      script.splice(Math.max(script.length - 1, 1), 0, line);
    }
  }

  while (script.length < target.min) {
    script.splice(
      Math.max(script.length - 1, 1),
      0,
      `There is more waiting for you at ${sub}`
    );
  }

  return script.slice(0, target.max);
}

function buildScript(input, duration) {
  const sub = speakable(subject(input));
  const det = details(input);

  const act1 = opening(sub, input, duration);
  const act2 = buildSupport(det);
  const actThree = act3(sub);
  const close = closing(sub, input);

  let script = [
    ...act1,
    act2,
    actThree,
    close,
  ].filter(Boolean);

  script = script.flatMap(splitLine);
  script = expand(script, duration, sub, input, det);
  script = script.map(speakable).map(ensurePeriod);

  return script.join("\n");
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
