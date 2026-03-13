import { NextResponse } from "next/server";

export const runtime = "nodejs";

const VERSION = "[[DEX_ENGINE_3ACT_SUBJECT_CONTROL_V2]]";

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

  return String(num);
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

  out = out.replace(
    /\b((?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+)\b/g,
    function (_, domain) {
      const cleaned = domain.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
      return formatWebsiteDomain(cleaned);
    }
  );

  out = out.replace(
    /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
    function (_, a, b, c) {
      return `${digitStringToWords(a)}, ${digitStringToWords(b)}, ${digitStringToWords(c)}`;
    }
  );

  out = out.replace(/\$([0-9]+)\.([0-9]{2})\b/g, function (_, dollars, cents) {
    return `${numberToWords(Number(dollars))} dollars and ${numberToWords(Number(cents))} cents`;
  });

  out = out.replace(/\$([0-9]+)\b/g, function (_, dollars) {
    const d = Number(dollars);
    return d === 1 ? "one dollar" : `${numberToWords(d)} dollars`;
  });

  out = out.replace(/\b([0-9]+)%\b/g, function (_, num) {
    return `${numberToWords(Number(num))} percent`;
  });

  out = out.replace(/\b([0-9]+)-for-([0-9]+)\b/gi, function (_, a, b) {
    return `${numberToWords(Number(a))} for ${numberToWords(Number(b))}`;
  });

  out = out.replace(
    /\b([0-9]{1,2}):([0-9]{2})\s?(a\.?m\.?|p\.?m\.?)\b/gi,
    function (_, h, m, ap) {
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
    }
  );

  out = out.replace(/\b([0-9]{1,2})\s?(am|pm|a\.m\.|p\.m\.)\b/gi, function (_, h, ap) {
    const suffix = /^a/i.test(ap) ? "a m" : "p m";
    return `${numberToWords(Number(h))} ${suffix}`;
  });

  out = out.replace(/&/g, " and ");
  out = out.replace(/\s{2,}/g, " ").trim();

  return out;
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

  if (/festival|fair|concert|event|music|rides|games|tickets|show|petting zoo/.test(blob)) {
    return "invitation";
  }

  if (/repair|broken|fix|injury|bail|lawyer|emergency/.test(blob)) {
    return "repair";
  }

  if (/service|utility|insurance|plan|provider|water|gas|power|cable|internet/.test(blob)) {
    return "maintenance";
  }

  if (/upgrade|remodel|cosmetic|furniture|mattress|improve|sectional/.test(blob)) {
    return "improvement";
  }

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
    "Sometimes the right move shows up when you need it",
    `${subject} has a way of getting your attention`,
  ]);
}

function closingLine(subject, input) {
  const cta = s(input.cta);
  if (cta) return cta;
  return `Visit ${subject}`;
}

function classifyDetail(detail) {
  const d = s(detail).toLowerCase();

  if (!d) return "other";
  if (/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b|\b\d{1,2}[–-]\d{1,2}\b|\b\d{4}\b/.test(d)) return "date";
  if (/\b(am|pm|a\.m\.|p\.m\.)\b|\bnoon\b|\bdaily\b|\bevery day\b/.test(d)) return "time";
  if (/\bfairgrounds\b|\bgrounds\b|\bchurch\b|\bcenter\b|\barena\b|\bpark\b|\blocated\b|\bat the\b/.test(d)) return "location";
  if (/\bfree\b|\bdiscount\b|\boff\b|\bsale\b|\bspecial\b|\bunder eight\b|\bunder 8\b/.test(d)) return "offer";
  if (/\bmusic\b|\bgames\b|\bcrafts\b|\bfood\b|\bperformance\b|\bpetting zoo\b|\brides\b/.test(d)) return "attraction";

  return "other";
}

function combineAttractions(list) {
  const items = uniqueLines(list).slice(0, 4);
  if (items.length === 0) return [];
  if (items.length === 1) return [items[0]];
  if (items.length === 2) return [`${items[0]} and ${items[1]}`];
  if (items.length === 3) return [`${items[0]}, ${items[1]} and ${items[2]}`];
  return [`${items[0]}, ${items[1]}, ${items[2]} and ${items[3]}`];
}

function buildInvitationAct2(details, subject) {
  const grouped = {
    offer: [],
    attraction: [],
    date: [],
    time: [],
    location: [],
    other: [],
  };

  for (const detail of details) {
    grouped[classifyDetail(detail)].push(detail);
  }

  const out = [];

  if (grouped.offer[0]) out.push(grouped.offer[0]);

  const combo = combineAttractions([
    ...grouped.attraction,
    ...grouped.other.slice(0, 2),
  ]);

  if (combo[0]) out.push(combo[0]);

  if (grouped.date[0] && grouped.time[0]) {
    out.push(`${grouped.date[0]} — ${grouped.time[0]}`);
  } else if (grouped.date[0]) {
    out.push(grouped.date[0]);
  } else if (grouped.time[0]) {
    out.push(grouped.time[0]);
  }

  if (grouped.location[0]) out.push(grouped.location[0]);

  if (grouped.attraction[4]) out.push(grouped.attraction[4]);
  if (grouped.other[2]) out.push(grouped.other[2]);

  return uniqueLines(out);
}

function invitationFillers(subject) {
  return [
    "Bring the family",
    "There is something for everybody",
    "This is one of those weekends",
    "Make plans now",
    "You do not want to miss this one",
    "A lot is waiting for you there",
    "That is the kind of weekend people remember",
    "The invitation is pretty clear",
    "There is a reason people make time for this",
    `Make time for ${subject}`,
    `That is why people show up for ${subject}`,
  ];
}

function nonInvitationFillers(subject) {
  return [
    "That is where it starts to make sense",
    "That usually gets your attention",
    "That is where the better move begins",
    "That is what changes the day",
    `That is where ${subject} matters`,
    "That is why people make the call",
  ];
}

function expandToTarget(base, duration, fillers) {
  const target = TARGET_LINES[duration];
  let script = uniqueLines(base);

  const pool = uniqueLines(fillers);

  for (const filler of pool) {
    if (script.length >= target.min) break;
    if (!script.includes(filler)) script.push(filler);
  }

  return script.slice(0, target.max);
}

function buildInvitationScript(input, duration) {
  const subject = inferSubject(input);
  const details = buildDetails(input);

  const act1 = [];
  const act2 = [];
  const act3 = [];

  act1.push(openingLine(subject, "invitation"));

  const act2Lines = buildInvitationAct2(details, subject);

  if (duration === 15) {
    act2.push(...act2Lines.slice(0, 3));
  } else if (duration === 30) {
    act2.push(...act2Lines.slice(0, 5));
  } else {
    act2.push(...act2Lines.slice(0, 7));
  }

  act3.push(closingLine(subject, input));

  const base = [...act1, ...act2, ...act3];

  const script = expandToTarget(base, duration, invitationFillers(subject));

  return script.map(ensurePeriod).join("\n");
}

function buildGenericScript(input, duration, situation) {
  const subject = inferSubject(input);
  const details = buildDetails(input);

  const base = [
    openingLine(subject, situation),
    ...details.slice(0, duration === 15 ? 2 : duration === 30 ? 4 : 7),
    closingLine(subject, input),
  ];

  const script = expandToTarget(base, duration, nonInvitationFillers(subject));

  return script.map(ensurePeriod).join("\n");
}

function buildScript(input, duration) {
  const situation = detectSituation(input);

  if (situation === "invitation") {
    return buildInvitationScript(input, duration);
  }

  return buildGenericScript(input, duration, situation);
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

    let script = buildScript(input, duration);
    script = formatBroadcastCopy(script);

    return NextResponse.json({
      ok: true,
      output: script,
      meta: {
        duration,
        situation: detectSituation(input),
        version: VERSION,
        actualLines: lines(script).length,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
