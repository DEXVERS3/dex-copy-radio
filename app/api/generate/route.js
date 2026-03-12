import { NextResponse } from "next/server";

export const runtime = "nodejs";

const VERSION = "[[DEX_RADIO_ENGINE_BUCKETS_V2]]";

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
    input.audience,
    input.cta,
    input.mustSay,
    input.tone,
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

  if (/repair|broken|emergency|bail|accident|injury|fix|pain|arrest|lawyer|legal|attorney|damage|urgent|crisis/.test(blob)) scores.repair += 4;
  if (/service|reliable|provider|plan|utility|power|water|gas|cable|internet|coverage|protect|maintenance|monthly|keep running|dependable/.test(blob)) scores.maintenance += 4;
  if (/upgrade|new|remodel|cosmetic|improve|better|sectional|furniture|mattress|smile|hair|plastic surgery|lasik|renovation|replace|refresh|look better/.test(blob)) scores.improvement += 4;
  if (/restaurant|bar|drink|dining|food|nightlife|brunch|cocktail|wings|burger|beer|happy hour|fun|party/.test(blob)) scores.experience += 4;
  if (/festival|fair|concert|event|tickets|music|show|rides|games|live performance|petting zoo|join us|come out|april|may|june|july|august|september|october|november|december/.test(blob)) scores.invitation += 5;

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return ranked[0][1] > 0 ? ranked[0][0] : "improvement";
}

function detectBucket(input) {
  const situation = detectSituation(input);

  if (situation === "repair") return 1;
  if (situation === "maintenance") return 2;
  if (situation === "improvement") return 3;
  if (situation === "invitation") return 4;
  return 5;
}

function inferSubject(input, bucket) {
  const brand = s(input.brand);
  const offer = s(input.offer);
  const cta = s(input.cta);
  const mustSay = lines(input.mustSay);
  const detailLines = lines(input.details);

  if (bucket === 4) {
    return brand || offer || mustSay[0] || detailLines[0] || "the event";
  }

  return brand || offer || cta || mustSay[0] || detailLines[0] || "the business";
}

function openingForBucket(subject, bucket) {
  if (bucket === 1) {
    return pick([
      "Sometimes trouble shows up faster than you expected",
      "When something goes wrong, the whole day usually follows",
      `That is when people start looking for ${subject}`,
    ]);
  }

  if (bucket === 2) {
    return pick([
      "Most days you never think about it",
      "The best systems are the ones that just keep working",
      `${subject} is built for exactly that`,
    ]);
  }

  if (bucket === 3) {
    return pick([
      "Sooner or later the upgrade becomes obvious",
      "Sometimes the right move changes everything around it",
      `That is where ${subject} comes in`,
    ]);
  }

  if (bucket === 4) {
    return pick([
      `This is your invitation to ${subject}`,
      `${subject} is one of those events you do not want to miss`,
      `You can feel certain weekends coming before they get here. ${subject} is one of them`,
    ]);
  }

  return pick([
    `${subject} has a way of getting your attention`,
    "Some places sell it. Others make you want to be there",
    "The right place tends to speak for itself",
  ]);
}

function speakableDetail(line) {
  const raw = s(line);
  if (!raw) return "";

  const lower = raw.toLowerCase();

  if (lower === "delivery available") return "And yes — they will deliver it";
  if (lower === "weekend only") return "This weekend only";
  if (lower === "kids under 8 ride free") return "Kids under eight ride free";
  if (lower === "live music") return "Live music";
  if (lower === "greek food") return "Greek food";
  if (lower === "crafts") return "Crafts";
  if (lower === "games") return "Games";
  if (lower === "petting zoo") return "Petting zoo";
  if (lower === "church fairgrounds") return "At the church fairgrounds";

  return raw;
}

function buildDetailLines(input) {
  return uniqueLines(lines(input.details)).map(speakableDetail).filter(Boolean);
}

function buildMustSayLines(input) {
  return uniqueLines(lines(input.mustSay)).map(speakableDetail).filter(Boolean);
}

function classifyDetail(detail) {
  const d = s(detail).toLowerCase();

  if (!d) return "other";
  if (/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b|\b\d{1,2}[–-]\d{1,2}\b|\b\d{4}\b/.test(d)) return "date";
  if (/\b(am|pm|a\.m\.|p\.m\.)\b|\bnoon\b|\bdaily\b|\bevery day\b/.test(d)) return "time";
  if (/\bfairgrounds\b|\bgrounds\b|\bchurch\b|\bcenter\b|\barena\b|\bpark\b|\blocated\b|\bat the\b/.test(d)) return "location";
  if (/\bfree\b|\bdiscount\b|\boff\b|\bsale\b|\bspecial\b|\bunder eight\b|\bunder 8\b/.test(d)) return "offer";
  if (/\bmusic\b|\bgames\b|\bcrafts\b|\bfood\b|\bperformance\b|\bpetting zoo\b|\brides\b|\bcomedy\b|\bbeer\b|\bwine\b/.test(d)) return "attraction";

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

function buildInvitationSupportLines(subject, details, offer, cta) {
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

  const attractionCombo = combineAttractions([
    ...grouped.attraction,
    ...grouped.other.slice(0, 2),
  ]);

  const out = [];

  if (offer) out.push(offer);

  if (attractionCombo[0]) {
    out.push(`${subject} brings you ${attractionCombo[0]}`);
  }

  if (grouped.date[0] && grouped.time[0]) {
    out.push(`${subject} runs ${grouped.date[0]} — ${grouped.time[0]}`);
  } else if (grouped.date[0]) {
    out.push(`${subject} runs ${grouped.date[0]}`);
  } else if (grouped.time[0]) {
    out.push(grouped.time[0]);
  }

  if (grouped.location[0]) {
    out.push(`${subject} happens ${grouped.location[0].replace(/^At /, "at ")}`);
  }

  if (grouped.attraction[4]) out.push(grouped.attraction[4]);
  if (grouped.other[2]) out.push(grouped.other[2]);

  out.push(`Make plans for ${subject}`);
  out.push(cta);

  return uniqueLines(out);
}

function supportLinesForBucket(subject, bucket) {
  if (bucket === 1) {
    return [
      `That is where ${subject} matters`,
      "Fast help changes everything",
      "You need somebody who knows what to do next",
      "That is why people call when it counts",
    ];
  }

  if (bucket === 2) {
    return [
      `That is what ${subject} is there for`,
      "Reliability has a way of paying off every day",
      "That is how life keeps moving",
      "That is what steady service sounds like",
    ];
  }

  if (bucket === 3) {
    return [
      `That is what ${subject} supports`,
      "One good change has a way of changing everything around it",
      "That is where the better version starts",
      "The right move tends to show up all at once",
    ];
  }

  if (bucket === 4) {
    return [
      `Everything here is in support of inviting people to ${subject}`,
      `${subject} is worth making time for`,
      "Bring the family",
      "This is one of those weekends",
      "You do not want to miss this one",
    ];
  }

  return [
    `${subject} is the reason people pay attention`,
    "That is where the good stuff starts",
    "That is the kind of place people talk about later",
  ];
}

function cleanupLines(linesIn) {
  const out = [];
  const seen = new Set();

  for (const raw of linesIn) {
    const line = s(raw).replace(/\s+/g, " ");
    const lower = line.toLowerCase();

    if (!line) continue;
    if (seen.has(lower)) continue;

    seen.add(lower);
    out.push(line);
  }

  return out;
}

function expandToTarget(base, extras, duration) {
  const target = TARGET_LINES[duration];
  let out = cleanupLines(base);

  for (const extra of extras) {
    if (out.length >= target.min) break;
    const candidate = cleanupLines([...out, extra]);
    if (candidate.length > out.length) out = candidate;
  }

  return out.slice(0, target.max);
}

function buildInvitationScript(input, subject, duration) {
  const open = openingForBucket(subject, 4);
  const offer = s(input.offer);
  const cta = s(input.cta) || `Visit ${subject}`;
  const details = buildDetailLines(input);
  const mustSay = buildMustSayLines(input);
  const support = supportLinesForBucket(subject, 4);

  let base = [
    open,
    ...buildInvitationSupportLines(subject, details, offer, cta),
  ];

  if (duration === 15) {
    base = base.slice(0, 6);
  } else if (duration === 30) {
    base = [
      open,
      ...buildInvitationSupportLines(subject, details, offer, cta).slice(0, 8),
      support[2],
      cta,
    ];
  } else {
    base = [
      open,
      ...buildInvitationSupportLines(subject, details, offer, cta),
      support[1],
      support[3],
      ...mustSay.slice(0, 2),
      cta,
    ];
  }

  const extras = shuffle([
    ...support,
    ...mustSay,
    `${subject} gives you more than one reason to go`,
    `There is a lot waiting for you at ${subject}`,
    `That is what makes ${subject} worth the trip`,
    `People go to ${subject} for a reason`,
    `It all leads back to ${subject}`,
    subject,
  ]);

  return expandToTarget(base, extras, duration);
}

function buildNonInvitationScript(input, subject, bucket, duration) {
  const open = openingForBucket(subject, bucket);
  const offer = s(input.offer);
  const cta = s(input.cta) || subject;
  const details = buildDetailLines(input);
  const mustSay = buildMustSayLines(input);
  const support = supportLinesForBucket(subject, bucket);

  let base = [open];

  if (offer) base.push(offer);

  if (duration === 15) {
    base.push(...support.slice(0, 1));
    base.push(...details.slice(0, 2));
    base.push(cta);
  } else if (duration === 30) {
    base.push(...support.slice(0, 2));
    base.push(...details.slice(0, 4));
    base.push(cta);
  } else {
    base.push(...support.slice(0, 3));
    base.push(...details.slice(0, 7));
    base.push(...mustSay.slice(0, 2));
    base.push(cta);
  }

  const extras = shuffle([
    ...support,
    ...details.slice(duration === 60 ? 7 : 4),
    ...mustSay,
    subject,
  ]);

  return expandToTarget(base, extras, duration);
}

function buildScript(input, bucket, subject, duration) {
  let scriptLines;

  if (bucket === 4) {
    scriptLines = buildInvitationScript(input, subject, duration);
  } else {
    scriptLines = buildNonInvitationScript(input, subject, bucket, duration);
  }

  return cleanupLines(scriptLines)
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

    const bucket = detectBucket(input);
    const subject = inferSubject(input, bucket);

    let script = buildScript(input, bucket, subject, duration);
    script = formatBroadcastCopy(script);

    return NextResponse.json({
      ok: true,
      output: script,
      meta: {
        duration,
        bucket,
        subject,
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
