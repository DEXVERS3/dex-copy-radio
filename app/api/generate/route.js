import { NextResponse } from "next/server";

export const runtime = "nodejs";

const VERSION = "[[DEX_ENGINE_V6_CLEAN]]";

const TARGET_WORDS = {
  15: { min: 28, max: 42 },
  30: { min: 60, max: 85 },
  60: { min: 125, max: 155 },
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

function wordCount(text) {
  const m = s(text).match(/\b[\w'-]+\b/g);
  return m ? m.length : 0;
}

function totalWords(arr) {
  return arr.reduce((n, line) => n + wordCount(line), 0);
}

function oxfordJoin(arr) {
  const a = arr.map(s).filter(Boolean);

  if (a.length === 0) return "";
  if (a.length === 1) return a[0];
  if (a.length === 2) return `${a[0]} and ${a[1]}`;

  return `${a.slice(0, -1).join(", ")}, and ${a[a.length - 1]}`;
}

function numberToWords(n) {
  const ones = [
    "zero", "one", "two", "three", "four",
    "five", "six", "seven", "eight", "nine"
  ];

  const teens = [
    "ten", "eleven", "twelve", "thirteen", "fourteen",
    "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"
  ];

  const tens = [
    "", "", "twenty", "thirty", "forty",
    "fifty", "sixty", "seventy", "eighty", "ninety"
  ];

  n = Number(n);

  if (!Number.isFinite(n)) return String(n);
  if (n < 10) return ones[n];
  if (n < 20) return teens[n - 10];

  if (n < 100) {
    const t = Math.floor(n / 10);
    const r = n % 10;
    return r ? `${tens[t]}-${ones[r]}` : tens[t];
  }

  if (n < 1000) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    return r
      ? `${ones[h]} hundred ${numberToWords(r)}`
      : `${ones[h]} hundred`;
  }

  if (n < 1000000) {
    const th = Math.floor(n / 1000);
    const r = n % 1000;
    return r
      ? `${numberToWords(th)} thousand ${numberToWords(r)}`
      : `${numberToWords(th)} thousand`;
  }

  return String(n);
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

  return map[n] || numberToWords(n);
}

function speakMoney(text) {
  return text.replace(/\$(\d+)(?:\.(\d{1,2}))?/g, (_, d, c) => {
    const dollars = numberToWords(Number(d));

    if (!c) return `${dollars} dollars`;

    const cents = numberToWords(Number(c));

    return `${dollars} dollars and ${cents} cents`;
  });
}

function speakDates(text) {
  return text.replace(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\s*[–-]\s*(\d{1,2})\b/gi,
    (_, month, a, b) => {
      const m = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
      return `${m} ${ordinalWord(Number(a))} through ${ordinalWord(Number(b))}`;
    }
  );
}

function speakUrls(text) {
  return text.replace(
    /\b(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+)\.(com|net|org|io|co|fm|tv|us|biz|info)\b/gi,
    (_, domain, tld) => `${domain.toLowerCase().split("").join(" ")} dot ${tld.toLowerCase()}`
  );
}

function speakNumbers(text) {
  return text.replace(/\b\d+\b/g, (n) => numberToWords(Number(n)));
}

function speakable(line) {
  let out = s(line);

  if (!out) return "";

  if (out.toLowerCase() === "kids under 8 ride free") {
    return "Kids under eight ride free";
  }

  out = out.replace(/\s*&\s*/g, " and ");
  out = speakMoney(out);
  out = speakDates(out);
  out = speakUrls(out);
  out = speakNumbers(out);

  return out;
}

function details(input) {
  return unique(lines(input.details)).map(speakable);
}

function buildSupport(det) {
  if (!det.length) return "";

  const list = det.slice(0, 5);

  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;

  const first = list.slice(0, -1).join(", ");
  const last = list[list.length - 1];

  return `${first}, and ${last}`;
}

function opening(sub, input, duration) {
  const offer = s(input.offer) ? speakable(input.offer) : "";

  if (duration === 60) {
    if (offer) {
      return [
        "You can feel certain weekends coming before they get here",
        `${sub} is one of them, and ${offer.toLowerCase()}`
      ];
    }

    return [
      "You can feel certain weekends coming before they get here",
      `${sub} is one of them`
    ];
  }

  if (offer) {
    return [
      pick([
        `This is your invitation to ${sub}`,
        `${sub} is one of those weekends people make room for`
      ]),
      offer
    ];
  }

  return [
    pick([
      `This is your invitation to ${sub}`,
      `${sub} is one of those events people look forward to`
    ])
  ];
}

function act3(sub) {
  return pick([
    "That sounds like a pretty good weekend",
    "That is the kind of weekend people look forward to",
    "That is not a bad way to spend a day",
    `That is why people make time for ${sub}`,
    `That is what makes ${sub} worth the trip`
  ]);
}

function closing(sub, input) {
  const cta = s(input.cta) ? speakable(input.cta) : "";

  if (cta) return cta;

  return `Visit ${sub}`;
}

function expansionLines(sub, duration) {
  if (duration === 15) {
    return [
      "Bring the family",
      "Make plans now",
      `That is how ${sub} gets your attention`
    ];
  }

  if (duration === 30) {
    return [
      "Bring the family",
      "Make plans now",
      "This is one of those weekends",
      "You do not want to miss this one",
      `That is how weekends like ${sub} earn a crowd`,
      "Once you hear that, the plan usually makes itself",
      "Food and music have a way of filling up a day",
      "That is when the weekend starts to picture itself"
    ];
  }

  return [
    "Bring the family",
    "Make plans now",
    "This is one of those weekends",
    "You do not want to miss this one",
    `That is how weekends like ${sub} earn a crowd`,
    "Once you hear that, the plan usually makes itself",
    "Food and music have a way of filling up a day",
    "That is when the weekend starts to picture itself",
    "A good festival has a way of taking over the whole day",
    "That is usually when the calendar starts to make room for it",
    "It just sounds like the kind of day people want to have",
    "A lot of good weekends start exactly like that",
    "That is usually all the convincing a person needs",
    "You can already hear how the day goes"
  ];
}

function expand(base, duration, sub) {
  const target = TARGET_WORDS[duration];
  const script = [...base];
  const extras = expansionLines(sub, duration);

  for (const line of extras) {
    if (totalWords(script) >= target.min) break;
    script.splice(Math.max(script.length - 1, 1), 0, line);
  }

  return script;
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
    close
  ].filter(Boolean);

  script = expand(script, duration, sub);
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
      details: s(body.details || body.text)
    };

    const script = buildScript(input, duration);

    return NextResponse.json({
      ok: true,
      output: script,
      meta: {
        duration,
        version: VERSION
      }
    });

  } catch {
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
