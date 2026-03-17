import { NextResponse } from "next/server";

export const runtime = "nodejs";

const VERSION = "[[DEX_ENGINE_V8_STORY_ARC]]";

const TARGET_WORDS = {
  15: { min: 28, max: 42 },
  30: { min: 55, max: 85 },
  60: { min: 115, max: 155 },
};

const TARGET_LINES = {
  15: { min: 5, max: 7 },
  30: { min: 8, max: 11 },
  60: { min: 14, max: 18 },
};

function s(v) {
  return typeof v === "string" ? v.trim() : "";
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
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
  return s(input.brand) || s(input.offer) || "the business";
}

function wordCount(text) {
  const m = s(text).match(/\b[\w'-]+\b/g);
  return m ? m.length : 0;
}

function totalWords(arr) {
  return arr.reduce((n, line) => n + wordCount(line), 0);
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

function cleanupText(text) {
  return s(text)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\r/g, "\n")
    .replace(/\s+/g, " ")
    .replace(/\.\s*,/g, ". ")
    .replace(/!\s*,/g, "! ")
    .replace(/\?\s*,/g, "? ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,+/g, ", ")
    .replace(/\s*\.\s*\./g, ".")
    .replace(/\s*-\s*/g, " — ")
    .replace(/\bn\b(?=\s+formal\b)/gi, "no")
    .replace(/([a-z])\.([A-Z])/g, "$1. $2")
    .replace(/([a-z])\.call\b/gi, "$1. call")
    .trim();
}

function cleanJoins(line) {
  return s(line)
    .replace(/\.\s+and\s+/gi, ". ")
    .replace(/\.\s+but\s+/gi, ". ")
    .replace(/\.\s+so\s+/gi, ". ")
    .replace(/\.\s+then\s+/gi, ". ")
    .replace(/\s+and\s+and\s+/gi, " and ")
    .replace(/\.\s+\./g, ".")
    .replace(/,\./g, ".")
    .trim();
}

function speakable(line) {
  let out = cleanupText(line);

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

function splitDetailFragments(text) {
  const raw = s(text);
  if (!raw) return [];

  const normalized = raw
    .replace(/\r/g, "\n")
    .replace(/\.\s*,/g, ". ")
    .replace(/!\s*,/g, "! ")
    .replace(/\?\s*,/g, "? ")
    .replace(/;\s+/g, ". ")
    .replace(/\n+/g, "\n");

  const chunks = normalized
    .split("\n")
    .flatMap((line) =>
      line
        .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/)
        .map((x) => x.trim())
        .filter(Boolean)
    );

  return unique(chunks.map(speakable).map(cleanupText).filter(Boolean));
}

function joinNatural(parts) {
  const list = parts.map(cleanupText).filter(Boolean);

  if (!list.length) return "";
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  if (list.length === 3) return `${list[0]}, ${list[1]}, and ${list[2]}`;

  return `${list.slice(0, -1).join(", ")}, and ${list[list.length - 1]}`;
}

function looksLikeDateOrTime(text) {
  const x = s(text).toLowerCase();

  return (
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(x) ||
    /\b\d{1,2}(am|pm)\b/.test(x) ||
    /\b\d{1,2}:\d{2}\b/.test(x) ||
    /\bnoon\b/.test(x) ||
    /\bmidnight\b/.test(x) ||
    /\bdaily\b/.test(x) ||
    /\bsaturday\b|\bsunday\b|\bmonday\b|\btuesday\b|\bwednesday\b|\bthursday\b|\bfriday\b/.test(x)
  );
}

function looksLikeContact(text) {
  const x = s(text).toLowerCase();

  return (
    /\b(?:call|visit|log on|check out|book now|learn more|join us|get tickets|register|apply)\b/.test(x) ||
    /\b(?:https?:\/\/|www\.)/.test(x) ||
    /\b[a-z0-9-]+\.(com|net|org|io|co|fm|tv|us|biz|info)\b/.test(x) ||
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(x)
  );
}

function looksLikeQuestion(text) {
  return /\?$/.test(s(text));
}

function looksLikeClaim(text) {
  const x = s(text).toLowerCase();
  return /\b(is|are|offers|has|provides|features|includes|available|accredited|award-winning|trusted|effective)\b/.test(x);
}

function looksLikeAudienceLine(text) {
  const x = s(text).toLowerCase();
  return /\byou\b|\byour\b|\bfor\b/.test(x);
}

function deriveFrame(input) {
  const blob = [input.brand, input.offer, input.details, input.cta, input.mustSay]
    .map(s)
    .join(" ")
    .toLowerCase();

  if (
    /unreliable|stooges|not even real|not gonna|probably not getting your money's worth|confession/.test(blob)
  ) {
    return "confession";
  }

  if (
    /university|college|school|course|career|education|class|classes|financial aid|degree|accredited|training/.test(blob)
  ) {
    return "growth";
  }

  if (
    /festival|fair|concert|show|parade|celebration|event|food|music|games|admission|tickets|ride free/.test(blob)
  ) {
    return "experience";
  }

  if (
    /sale|discount|save|off|clearance|deal|financing|inventory|showroom|mattress|sectional|delivery/.test(blob)
  ) {
    return "value";
  }

  if (
    /service|repair|law|lawyer|attorney|legal|clinic|doctor|dentist|roofing|plumbing|hvac|insurance|consultation/.test(blob)
  ) {
    return "problem";
  }

  return "general";
}

function openingPool(sub, frame) {
  if (frame === "experience") {
    return [
      `You can feel certain days coming before they get here`,
      `${sub} is the kind of thing people make room for`,
      `Some plans sound good the second you hear them`
    ];
  }

  if (frame === "growth") {
    return [
      `At some point, the next step starts to matter`,
      `Sooner or later, the question becomes what comes next`,
      `There comes a point when waiting starts to feel expensive`
    ];
  }

  if (frame === "problem") {
    return [
      `Most people wait a little longer than they should`,
      `There comes a point when putting it off stops helping`,
      `Usually the problem is not whether it matters`
    ];
  }

  if (frame === "value") {
    return [
      `Sooner or later, value gets hard to ignore`,
      `There comes a point when the smart move gets obvious`,
      `Funny how the right offer changes the math`
    ];
  }

  if (frame === "confession") {
    return [
      `Not every business leads with a confession, but here we are`,
      `There is something to be said for a business that tells you exactly what it is`,
      `Well, at least ${sub} is being honest`
    ];
  }

  return [
    `Here is the thing about ${sub}`,
    `Sooner or later, people start paying attention`,
    `Sometimes the case starts making itself`
  ];
}

function buildAct1(sub, input, frame, duration) {
  const offer = s(input.offer) ? speakable(input.offer) : "";
  const opener = pick(openingPool(sub, frame));
  const out = [opener];

  if (offer) {
    if (frame === "experience") {
      out.push(`${sub} has ${offer.toLowerCase()}`);
    } else if (frame === "growth") {
      out.push(`${sub} has ${offer.toLowerCase()}`);
    } else if (frame === "problem") {
      out.push(`${sub} has ${offer.toLowerCase()}`);
    } else if (frame === "value") {
      out.push(`${sub} has ${offer.toLowerCase()}`);
    } else if (frame === "confession") {
      out.push(offer);
    } else {
      out.push(offer);
    }
  } else if (duration === 60 && frame !== "confession") {
    out.push(`${sub} is where that starts to come together`);
  }

  return out.filter(Boolean);
}

function parseBrief(input) {
  const detailLines = splitDetailFragments(input.details);
  const mustSayLines = splitDetailFragments(input.mustSay);

  const all = unique([...detailLines, ...mustSayLines]);

  const questions = [];
  const schedule = [];
  const contact = [];
  const claims = [];
  const audience = [];
  const misc = [];

  for (const line of all) {
    if (looksLikeContact(line)) {
      contact.push(line);
    } else if (looksLikeQuestion(line)) {
      questions.push(line);
    } else if (looksLikeDateOrTime(line)) {
      schedule.push(line);
    } else if (looksLikeClaim(line)) {
      claims.push(line);
    } else if (looksLikeAudienceLine(line)) {
      audience.push(line);
    } else {
      misc.push(line);
    }
  }

  return {
    questions,
    schedule,
    contact,
    claims,
    audience,
    misc,
    all,
  };
}

function buildAct2(parsed, duration) {
  const out = [];

  for (const q of parsed.questions) {
    out.push(q);
    if (duration === 15 && out.length >= 1) break;
    if (duration === 30 && out.length >= 2) break;
    if (duration === 60 && out.length >= 2) break;
  }

  const supporting = [...parsed.claims, ...parsed.audience, ...parsed.misc];

  let i = 0;
  while (i < supporting.length) {
    const current = supporting[i];
    const next = supporting[i + 1];

    const canPair =
      next &&
      !looksLikeQuestion(current) &&
      !looksLikeQuestion(next) &&
      !looksLikeDateOrTime(current) &&
      !looksLikeDateOrTime(next) &&
      !looksLikeContact(current) &&
      !looksLikeContact(next) &&
      !/[.!?]/.test(current) &&
      !/[.!?]/.test(next) &&
      wordCount(current) <= 7 &&
      wordCount(next) <= 7;

    if (canPair) {
      out.push(joinNatural([current, next]));
      i += 2;
    } else {
      out.push(current);
      i += 1;
    }
  }

  for (const item of parsed.schedule) {
    out.push(item);
  }

  const maxAct2 =
    duration === 15 ? 2 :
    duration === 30 ? 4 :
    7;

  return unique(out).slice(0, maxAct2);
}

function act3Pool(sub, frame) {
  if (frame === "experience") {
    return [
      `That is the kind of day people remember`,
      `That is what makes ${sub} worth showing up for`,
      `That is how plans stop sounding hypothetical`
    ];
  }

  if (frame === "growth") {
    return [
      `That is where the next step starts looking real`,
      `That is not a bad way to move your life forward`,
      `That is usually when the decision starts making sense`
    ];
  }

  if (frame === "problem") {
    return [
      `That is usually when the right call gets obvious`,
      `That is not exactly the kind of thing you keep putting off`,
      `That is where the next move starts making itself`
    ];
  }

  if (frame === "value") {
    return [
      `That is usually all the convincing a person needs`,
      `That is when the smart money stops waiting`,
      `That is not a bad reason to make the move`
    ];
  }

  if (frame === "confession") {
    return [
      `Honestly, the straight answer is doing a lot of work here`,
      `At some point, brutal honesty becomes the selling point`,
      `You may not trust the pitch, but at least the pitch is honest`
    ];
  }

  return [
    `That is where the whole thing starts to land`,
    `That is usually enough to get a person moving`,
    `That is when the case starts making itself`
  ];
}

function closing(sub, input, parsed) {
  const rawCta = s(input.cta);

  if (rawCta) {
    return speakable(rawCta);
  }

  const contact = parsed.contact[0];
  if (contact) return contact;

  return `Visit ${sub}`;
}

function enrichClose(close, parsed, duration) {
  const out = [];

  if (duration >= 30 && parsed.contact.length > 0) {
    for (const item of parsed.contact) {
      if (s(item).toLowerCase() === s(close).toLowerCase()) continue;
      out.push(item);
      if (duration === 30) break;
      if (out.length >= 2) break;
    }
  }

  return out;
}

function expansionPool(sub, frame) {
  if (frame === "experience") {
    return [
      `Bring the family`,
      `Make plans now`,
      `Once you hear that, the day starts to picture itself`,
      `That is usually enough to fill a calendar`,
      `Good events have a way of making the decision for you`
    ];
  }

  if (frame === "growth") {
    return [
      `The right opportunity has a way of clearing the fog`,
      `That is usually when hesitation starts losing ground`,
      `A better future sounds different when it feels possible`,
      `That is when the next chapter stops feeling abstract`,
      `Real flexibility tends to get a person's attention`
    ];
  }

  if (frame === "problem") {
    return [
      `At that point, waiting is not exactly a strategy`,
      `This is when the practical move starts sounding good`,
      `Most people know the answer before they say it out loud`,
      `Eventually, the fix becomes the plan`,
      `That is usually how the delay comes to an end`
    ];
  }

  if (frame === "value") {
    return [
      `The right offer has a way of shortening the conversation`,
      `That tends to get a person's attention`,
      `A smart move usually looks smart pretty quickly`,
      `That is where browsing starts to end`,
      `You can only think about it for so long`
    ];
  }

  if (frame === "confession") {
    return [
      `They did not exactly bury the lead`,
      `There is no confusion in the pitch`,
      `You cannot say they oversold it`,
      `There is a weird amount of confidence in saying the quiet part out loud`,
      `The straight-faced nonsense is doing its job`
    ];
  }

  return [
    `That starts to make the case`,
    `Now the picture gets clearer`,
    `That is usually enough to get attention`,
    `A good message usually gets simpler as it goes`,
    `That is when the next step gets easier to see`
  ];
}

function expand(base, duration, sub, frame) {
  const wordTarget = TARGET_WORDS[duration];
  const lineTarget = TARGET_LINES[duration];
  const script = [...base];
  const extras = expansionPool(sub, frame);

  for (const line of extras) {
    const enoughWords = totalWords(script) >= wordTarget.min;
    const enoughLines = script.length >= lineTarget.min;

    if (enoughWords && enoughLines) break;

    script.splice(Math.max(script.length - 1, 1), 0, line);
  }

  return script;
}

function trimToMaxLines(script, duration) {
  const maxLines = TARGET_LINES[duration].max;

  if (script.length <= maxLines) return script;

  const last = script[script.length - 1];
  const body = script.slice(0, maxLines - 1);

  return [...body, last];
}

function buildScript(input, duration) {
  const sub = speakable(subject(input));
  const frame = deriveFrame(input);
  const parsed = parseBrief(input);

  const act1 = buildAct1(sub, input, frame, duration);
  const act2 = buildAct2(parsed, duration);
  const act3 = pick(act3Pool(sub, frame));
  const close = closing(sub, input, parsed);
  const closeSupport = enrichClose(close, parsed, duration);

  let script = [
    ...act1,
    ...act2,
    act3,
    ...closeSupport,
    close
  ].filter(Boolean);

  script = expand(script, duration, sub, frame);

  script = unique(
    script
      .map(speakable)
      .map(cleanupText)
      .map(cleanJoins)
      .filter(Boolean)
  );

  script = script.map(ensurePeriod);
  script = trimToMaxLines(script, duration);

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
