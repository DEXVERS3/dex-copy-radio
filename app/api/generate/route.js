import { NextResponse } from "next/server";

export const runtime = "nodejs";

const VERSION = "[[DEX_ENGINE_V11_BRIEF_FIRST]]";

const TARGET_LINES = {
  15: { min: 4, max: 6 },
  30: { min: 7, max: 9 },
  60: { min: 10, max: 13 },
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
    .replace(/\s*—\s*/g, " — ")
    .replace(/\s*-\s*/g, " — ")
    .replace(/([a-z])\.([A-Z])/g, "$1. $2")
    .replace(/([a-z])\.call\b/gi, "$1. call")
    .replace(/\bYOYOU'?RE\b/gi, "YOU'RE")
    .replace(/\bYOU'?RE\b(?=\s+SCHEDULE)/gi, "YOUR")
    .replace(/\bSHEDULE\b/gi, "SCHEDULE")
    .replace(/\bEDUCATIN\b/gi, "EDUCATION")
    .replace(/\bEFECTIVE\b/gi, "EFFECTIVE")
    .replace(/\bNLINE\b/gi, "ONLINE")
    .replace(/\bRG\b/gi, "ORG")
    .replace(/\bMAESTR\b/gi, "MAESTRO")
    .replace(/\bMAESTO\b/gi, "MAESTRO")
    .replace(/\bn\b(?=\s+formal\b)/gi, "no")
    .trim();
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
    return r ? `${ones[h]} hundred ${numberToWords(r)}` : `${ones[h]} hundred`;
  }

  if (n < 1000000) {
    const th = Math.floor(n / 1000);
    const r = n % 1000;
    return r ? `${numberToWords(th)} thousand ${numberToWords(r)}` : `${numberToWords(th)} thousand`;
  }

  return String(n);
}

function ordinalWord(n) {
  const map = {
    1: "first", 2: "second", 3: "third", 4: "fourth", 5: "fifth",
    6: "sixth", 7: "seventh", 8: "eighth", 9: "ninth", 10: "tenth",
    11: "eleventh", 12: "twelfth", 13: "thirteenth", 14: "fourteenth",
    15: "fifteenth", 16: "sixteenth", 17: "seventeenth", 18: "eighteenth",
    19: "nineteenth", 20: "twentieth", 21: "twenty-first", 22: "twenty-second",
    23: "twenty-third", 24: "twenty-fourth", 25: "twenty-fifth", 26: "twenty-sixth",
    27: "twenty-seventh", 28: "twenty-eighth", 29: "twenty-ninth",
    30: "thirtieth", 31: "thirty-first",
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
    (_, domain, tld) => {
      if (domain.length <= 8 && /^[a-z]+$/i.test(domain)) {
        return `${domain.toLowerCase().split("").join(" ")} dot ${tld.toLowerCase()}`;
      }
      return `${domain.toLowerCase()} dot ${tld.toLowerCase()}`;
    }
  );
}

function speakTimes(text) {
  let out = text;

  out = out.replace(/\b(\d{1,2})\s?p\b/gi, (_, h) => `${numberToWords(Number(h))} p m`);
  out = out.replace(/\b(\d{1,2})\s?a\b/gi, (_, h) => `${numberToWords(Number(h))} a m`);
  out = out.replace(/\b(\d{1,2}):(\d{2})\s?(am|pm)\b/gi, (_, h, m, ap) => {
    const hh = numberToWords(Number(h));
    const mm = Number(m) === 0 ? "" : ` ${numberToWords(Number(m))}`;
    return `${hh}${mm} ${ap.toLowerCase().split("").join(" ")}`.trim();
  });

  return out;
}

function speakNumbers(text) {
  return text.replace(/\b\d+\b/g, (n) => numberToWords(Number(n)));
}

function speakable(line) {
  let out = cleanupText(line);
  if (!out) return "";

  out = out.replace(/\s*&\s*/g, " and ");
  out = speakMoney(out);
  out = speakDates(out);
  out = speakUrls(out);
  out = speakTimes(out);
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

  return unique(chunks.map(cleanupText).filter(Boolean));
}

function looksLikeQuestion(text) {
  return /\?$/.test(s(text));
}

function looksLikeDateOrTime(text) {
  const x = s(text).toLowerCase();
  return (
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(x) ||
    /\b\d{1,2}(am|pm)\b/.test(x) ||
    /\b\d{1,2}\s[a]\sm\b|\b\d{1,2}\s[p]\sm\b/.test(x) ||
    /\bnoon\b|\bmidnight\b|\bdaily\b/.test(x) ||
    /\bsaturday\b|\bsunday\b|\bmonday\b|\btuesday\b|\bwednesday\b|\bthursday\b|\bfriday\b/.test(x)
  );
}

function looksLikeUrl(text) {
  return /\b(?:https?:\/\/|www\.)|\b[a-z0-9-]+\.(com|net|org|io|co|fm|tv|us|biz|info)\b/i.test(s(text));
}

function looksLikePhone(text) {
  return /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(s(text));
}

function looksLikeAddress(text) {
  return /\b(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct)\b/i.test(s(text));
}

function looksLikeContact(text) {
  const x = s(text).toLowerCase();
  return (
    /\b(call|visit|log on|check out|book now|learn more|join us|get tickets|register|apply|stop by)\b/.test(x) ||
    looksLikeUrl(x) ||
    looksLikePhone(x) ||
    looksLikeAddress(x)
  );
}

function deriveFrame(input) {
  const blob = [input.brand, input.offer, input.details, input.cta, input.mustSay]
    .map(s)
    .join(" ")
    .toLowerCase();

  if (/unreliable|stooges|not even real|not gonna|confession|money's worth/.test(blob)) {
    return "confession";
  }

  if (/university|college|school|course|career|education|class|classes|financial aid|degree|accredited|training/.test(blob)) {
    return "growth";
  }

  if (/festival|fair|concert|show|parade|celebration|event|food|music|games|admission|tickets|ride free/.test(blob)) {
    return "experience";
  }

  if (/sale|discount|save|off|clearance|deal|financing|inventory|showroom|mattress|sectional|delivery/.test(blob)) {
    return "value";
  }

  if (/service|repair|law|lawyer|attorney|legal|clinic|doctor|dentist|roofing|plumbing|hvac|insurance|consultation/.test(blob)) {
    return "problem";
  }

  return "general";
}

function openingPool(sub, frame) {
  if (frame === "experience") {
    return [
      "You can feel certain days coming before they get here",
      `${sub} is the kind of thing people make room for`,
      "Some plans sound good the second you hear them"
    ];
  }

  if (frame === "growth") {
    return [
      "Sooner or later, the question becomes what comes next",
      "At some point, the next step starts to matter",
      "There comes a point when waiting starts to feel expensive"
    ];
  }

  if (frame === "problem") {
    return [
      "There comes a point when putting it off stops helping",
      "Most people wait a little longer than they should",
      "Usually the problem is not whether it matters"
    ];
  }

  if (frame === "value") {
    return [
      "Sooner or later, value gets hard to ignore",
      "There comes a point when the smart move gets obvious",
      "Funny how the right offer changes the math"
    ];
  }

  if (frame === "confession") {
    return [
      "Not every business leads with a confession, but here we are",
      "There is something to be said for a business that tells you exactly what it is",
      `Well, at least ${sub} is being honest`
    ];
  }

  return [
    `Here is the thing about ${sub}`,
    "Sooner or later, people start paying attention",
    "Sometimes the case starts making itself"
  ];
}

function act3Pool(sub, frame) {
  if (frame === "experience") {
    return [
      "That is the kind of day people remember",
      `That is what makes ${sub} worth showing up for`,
      "That is how plans stop sounding hypothetical"
    ];
  }

  if (frame === "growth") {
    return [
      "That is where the next step starts looking real",
      "That is not a bad way to move your life forward",
      "That is usually when the decision starts making sense"
    ];
  }

  if (frame === "problem") {
    return [
      "That is usually when the right call gets obvious",
      "That is not exactly the kind of thing you keep putting off",
      "That is where the next move starts making itself"
    ];
  }

  if (frame === "value") {
    return [
      "That is usually all the convincing a person needs",
      "That is when the smart money stops waiting",
      "That is not a bad reason to make the move"
    ];
  }

  if (frame === "confession") {
    return [
      "Honestly, the straight answer is doing a lot of work here",
      "At some point, brutal honesty becomes the selling point",
      "You may not trust the pitch, but at least the pitch is honest"
    ];
  }

  return [
    "That is where the whole thing starts to land",
    "That is usually enough to get a person moving",
    "That is when the case starts making itself"
  ];
}

function fragmentToSentence(line, frame, sub) {
  const raw = cleanupText(line);
  const lower = raw.toLowerCase();

  if (!raw) return "";
  if (looksLikeQuestion(raw) || looksLikeDateOrTime(raw) || looksLikeContact(raw) || /[.!?]$/.test(raw)) {
    return raw;
  }

  if (frame === "confession") {
    if (/lost money/.test(lower)) return "We're not gonna find your lost money";
    if (/jail/.test(lower)) return "We can't get you out of jail";
    if (/will\b/.test(lower)) return "We can't write your will";
    if (/lawyer/.test(lower)) return "We're not even real lawyers";
    if (/education/.test(lower)) return "We have no formal education";
    if (/stooge/.test(lower)) return "We're just a couple of stooges";
    if (/your money/.test(lower)) return "It's your money";
  }

  if (frame === "growth") {
    if (/software engineer/.test(lower)) return "Software engineer?";
    if (/building a business/.test(lower)) return "Building a business?";
    if (/schedule/.test(lower)) return "Your schedule isn't fixed";
    if (/education/.test(lower) && /shouldn/.test(lower)) return "Your education shouldn't be either";
    if (/attend classes/.test(lower)) return "Attend classes on your time";
    if (/career/.test(lower) && /ai/.test(lower)) return `${sub} is the most effective way to build your career with AI`;
    if (/accredited/.test(lower)) return `${sub} offers accredited course study`;
    if (/financial aid/.test(lower)) return `${sub} has financial aid available`;
    if (/free laptop/.test(lower)) return "Earn a free laptop for your studies";
  }

  if (frame === "experience") {
    if (/bring the family/.test(lower)) return "Bring the family";
    if (/make plans now/.test(lower)) return "Make plans now";
  }

  if (frame === "value") {
    if (/delivery/.test(lower)) return "And yes — they will deliver it";
    if (/financial aid/.test(lower)) return `${sub} has financial aid available`;
  }

  if (wordCount(raw) <= 5) {
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  return raw;
}

function parseBrief(input, frame, sub) {
  const details = splitDetailFragments(input.details).map((x) => fragmentToSentence(x, frame, sub));
  const mustSay = splitDetailFragments(input.mustSay);
  const all = unique([...details, ...mustSay]).filter(Boolean);

  const buckets = {
    questions: [],
    schedule: [],
    contact: [],
    info: [],
    mustSay: mustSay.map(cleanupText).filter(Boolean),
  };

  for (const line of all) {
    if (buckets.mustSay.some((m) => s(m).toLowerCase() === s(line).toLowerCase())) continue;

    if (looksLikeQuestion(line)) {
      buckets.questions.push(line);
    } else if (looksLikeDateOrTime(line)) {
      buckets.schedule.push(line);
    } else if (looksLikeContact(line)) {
      buckets.contact.push(line);
    } else {
      buckets.info.push(line);
    }
  }

  return buckets;
}

function buildAct1(sub, input, frame) {
  const out = [pick(openingPool(sub, frame))];
  const offer = s(input.offer) ? fragmentToSentence(input.offer, frame, sub) : "";

  if (offer) {
    if (frame === "growth" && /financial aid/i.test(offer)) {
      out.push(`${sub} has financial aid available`);
    } else if (frame === "confession") {
      out.push(offer);
    } else if (wordCount(offer) <= 10 && !/[.!?]$/.test(offer)) {
      out.push(`${sub} has ${offer.toLowerCase()}`);
    } else {
      out.push(offer);
    }
  }

  return unique(out.filter(Boolean));
}

function buildAct2(parsed, duration) {
  const out = [];

  const qLimit = duration === 15 ? 1 : 2;
  for (const q of parsed.questions.slice(0, qLimit)) out.push(q);

  const infoLimit = duration === 15 ? 2 : duration === 30 ? 4 : 5;
  for (const item of parsed.info.slice(0, infoLimit)) out.push(item);

  const scheduleLimit = duration === 60 ? 2 : 1;
  for (const item of parsed.schedule.slice(0, scheduleLimit)) out.push(item);

  return unique(out);
}

function buildAct3(sub, frame) {
  return pick(act3Pool(sub, frame));
}

function closing(sub, input, parsed) {
  const rawCta = s(input.cta);
  if (rawCta) return cleanupText(rawCta);

  if (parsed.contact.length) return parsed.contact[0];

  return `Visit ${sub}`;
}

function buildFill(parsed, chosen, duration) {
  if (duration === 15) return [];

  const used = new Set(chosen.map((x) => s(x).toLowerCase()));
  const fill = [];

  const candidates = [
    ...parsed.contact,
    ...parsed.schedule,
    ...parsed.info,
  ];

  for (const item of candidates) {
    const key = s(item).toLowerCase();
    if (!key || used.has(key)) continue;
    fill.push(item);

    if (duration === 30 && fill.length >= 1) break;
    if (duration === 60 && fill.length >= 2) break;
  }

  return fill;
}

function trimToTarget(script, duration) {
  const target = TARGET_LINES[duration];

  if (script.length < target.min) return script;
  if (script.length <= target.max) return script;

  const close = script[script.length - 1];
  const beforeClose = script.slice(0, -1);

  while (beforeClose.length + 1 > target.max) {
    beforeClose.pop();
  }

  return [...beforeClose, close];
}

function normalizeOutput(script) {
  return unique(
    script
      .map(speakable)
      .map(cleanupText)
      .filter(Boolean)
  ).map(ensurePeriod);
}

function buildScript(input, duration) {
  const sub = speakable(subject(input));
  const frame = deriveFrame(input);
  const parsed = parseBrief(input, frame, sub);

  const act1 = buildAct1(sub, input, frame);
  const act2 = buildAct2(parsed, duration);
  const act3 = [buildAct3(sub, frame)];
  const close = closing(sub, input, parsed);

  let chosen = [...act1, ...act2, ...act3, close];
  const fill = buildFill(parsed, chosen, duration);

  let mustSay = parsed.mustSay;
  if (duration === 15 && mustSay.length > 1) {
    mustSay = mustSay.slice(0, 1);
  } else if (duration === 30 && mustSay.length > 2) {
    mustSay = mustSay.slice(0, 2);
  }

  let script = [
    ...act1,
    ...act2,
    ...fill,
    ...act3,
    close,
    ...mustSay,
  ].filter(Boolean);

  script = normalizeOutput(script);
  script = trimToTarget(script, duration);

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
