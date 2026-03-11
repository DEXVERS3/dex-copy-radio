import { NextResponse } from "next/server";

export const runtime = "nodejs";

const VERSION = "[[DEX_RADIO_CONVERSATION_ENGINE_V5]]";

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

function containsAny(text, words) {
  const hay = s(text).toLowerCase();
  return words.some((w) => hay.includes(w));
}

function buildContext(input) {
  const blob = [
    input.brand,
    input.offer,
    input.audience,
    input.details,
    input.tone,
    input.cta,
    input.mustSay,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return {
    sports: containsAny(blob, [
      "eagles",
      "football",
      "nfl",
      "game",
      "gameday",
      "sports bar",
      "sunday ticket",
      "kickoff",
      "birds",
      "cowboys",
      "philly",
      "tailgate",
      "touchdown",
      "go birds",
      "fly eagles fly",
      "jawn",
    ]),
    foodDrink: containsAny(blob, [
      "mimosa",
      "cider",
      "beer",
      "bar",
      "burger",
      "wings",
      "brunch",
      "drink",
      "cocktail",
      "happy hour",
    ]),
    mattress: containsAny(blob, [
      "mattress",
      "sleep",
      "back relief",
      "back pain",
      "bed",
      "pillow",
      "spine",
      "couch",
      "doghouse",
    ]),
    retail: containsAny(blob, [
      "sale",
      "clearance",
      "weekend sale",
      "percent off",
      "discount",
      "shop",
      "store",
      "furniture",
      "delivery available",
      "sectionals",
    ]),
    auto: containsAny(blob, [
      "car",
      "truck",
      "lease",
      "dealer",
      "dealership",
      "oil",
      "service",
      "tires",
      "trade",
      "auto",
    ]),
    event: containsAny(blob, [
      "concert",
      "show",
      "tickets",
      "event",
      "festival",
      "live music",
      "comedy",
    ]),
    loud: containsAny(blob, ["loud", "rowdy", "wild", "crazy", "party", "hype"]),
  };
}

function buildSituation(input) {
  const ctx = buildContext(input);

  if (ctx.mattress) {
    return pick([
      "(yawn)",
      "I have been sleeping in the doghouse all week",
      "Turns out the couch is not built for a grown adult",
    ]);
  }

  if (ctx.sports && ctx.foodDrink && ctx.loud) {
    return pick([
      "If you came for polite, you picked the wrong bar",
      "When the Birds kick off, this place gets loud",
      "Game day in here is not for the quiet crowd",
    ]);
  }

  if (ctx.sports) {
    return pick([
      "When the game starts, the room changes",
      "Some places show the game. This place lives it",
      "If the Birds are on, you know where everybody ends up",
    ]);
  }

  if (ctx.retail) {
    return pick([
      "Sooner or later the weekend turns into a hunt for a deal",
      "Funny how the right move usually appears when you need it",
      "You know the moment when a good idea suddenly shows up",
    ]);
  }

  if (ctx.foodDrink) {
    return pick([
      "Some nights start the second somebody says one more round",
      "You know the kind of place where one drink turns into a story",
      "Some spots do food and drinks. Others do a night worth talking about",
    ]);
  }

  if (ctx.auto) {
    return pick([
      "There comes a moment when your car tells on itself",
      "You can ignore a lot. Your car usually is not one of them",
      "That little sound, that light, that feeling. Yeah. It is time",
    ]);
  }

  if (ctx.event) {
    return pick([
      "When the lights go down, the excuses disappear",
      "Some nights are supposed to stay home. This is not one of them",
      "You can feel certain nights coming before they get here",
    ]);
  }

  return pick([
    "Funny how the right move usually appears when you need it",
    "You know the moment when a good idea suddenly shows up",
    "Sometimes the whole plan changes with one good idea",
  ]);
}

const STORY_BEATS = [
  "reaction",
  "problem",
  "explanation",
  "aside",
  "reinforcement",
  "punchline",
];

function buildBeat(type, input) {
  const brand = input.brand;
  const ctx = buildContext(input);

  if (type === "reaction") {
    return pick([
      "You know the feeling",
      "Yeah… that will do it",
      "Right about now it starts making sense",
    ]);
  }

  if (type === "problem") {
    if (ctx.mattress) {
      return pick([
        "Turns out the couch will wreck your back",
        "Funny how the couch stops being funny after three nights",
      ]);
    }

    if (ctx.retail) {
      return pick([
        "Funny how waiting around stops making sense",
        "Sooner or later it catches up",
        "At some point the old setup is just in the way",
      ]);
    }

    return pick([
      "Funny how ignoring the problem stops working",
      "Sooner or later it catches up",
      "Turns out that was not the best plan",
    ]);
  }

  if (type === "explanation") {
    return pick([
      `Which is why people end up at ${brand}`,
      `${brand} is why`,
      `That is where ${brand} comes in`,
    ]);
  }

  if (type === "aside") {
    return pick([
      "Look… we have all been there",
      "You know exactly what I mean",
      "Anyway…",
    ]);
  }

  if (type === "reinforcement") {
    return pick([
      "Now we are getting somewhere",
      "That usually does the trick",
      "That is the idea",
    ]);
  }

  if (type === "punchline") {
    if (ctx.mattress) {
      return pick([
        "We gotta chase the mailman at ten",
        "I will handle that after lunch",
      ]);
    }

    if (ctx.retail) {
      return pick([
        "That solves that",
        "Now that makes sense",
        "Yeah… that will do it",
      ]);
    }

    return pick([
      "Problem solved",
      "Yeah… that will do it",
      "Exactly",
    ]);
  }

  return "";
}

function speakableDetail(line) {
  const raw = s(line);
  if (!raw) return "";

  const lower = raw.toLowerCase();

  if (lower === "delivery available") return "And yes — they will deliver it";
  if (lower === "weekend only") return "This weekend only";
  if (lower === "memorial day sale") return "Memorial Day Sale";
  if (lower === "memory foam") return "Memory foam support";
  if (lower === "back relief mattresses") return "Back relief mattresses";
  if (lower === "open late") return "Open late";
  if (lower === "sleep trial") return "Sleep trial";
  if (lower === "nfl sunday ticket") return "Catch every snap live with NFL Sunday Ticket";
  if (lower === "youtube sunday ticket") return "Catch every snap live with YouTube's Sunday Ticket";
  if (lower === "sunday ticket") return "Catch every snap live with Sunday Ticket";
  if (lower === "fly eagles fly") return "Fly Eagles Fly";
  if (lower === "go birds") return "Go Birds";

  if (lower.includes("delivery")) return "And yes — they will deliver it";
  if (lower === "40% off sectionals") return "Forty percent off sectionals";
  if (lower === "50% off") return "Fifty percent off";

  return raw;
}

function isWeakLine(line) {
  const lower = s(line).toLowerCase();

  return (
    lower === "delivery available" ||
    lower === "details" ||
    lower === "offer" ||
    lower === "cta" ||
    lower === "tag" ||
    lower === "anyway…" ||
    lower === "anyway..." ||
    lower === "you know exactly what i mean" ||
    lower === "right about now it starts making sense" ||
    lower === "that usually does the trick" ||
    lower === "that is the idea"
  );
}

function lineMentionsBrand(line, brand) {
  const l = s(line).toLowerCase();
  const b = s(brand).toLowerCase();
  if (!l || !b) return false;
  return l.includes(b);
}

function lineIsExplanation(line) {
  const lower = s(line).toLowerCase();
  return (
    lower.includes("which is why people end up at") ||
    lower.includes("is why") ||
    lower.includes("that is where") ||
    lower.includes("that is why")
  );
}

function lineIsOffer(line) {
  const lower = s(line).toLowerCase();
  return lower.includes("sale") || lower.includes("percent off");
}

function lineIsDelivery(line) {
  const lower = s(line).toLowerCase();
  return lower.includes("deliver");
}

function lineIsWeekend(line) {
  return s(line).toLowerCase().includes("weekend");
}

function lineIsSoftFiller(line) {
  const lower = s(line).toLowerCase();
  return (
    lower === "look… we have all been there" ||
    lower === "you know how that goes" ||
    lower === "you know the feeling"
  );
}

function sameIdea(a, b) {
  const x = s(a).toLowerCase();
  const y = s(b).toLowerCase();

  if (!x || !y) return false;

  const clusters = [
    ["hunt for a deal", "waiting around stops making sense", "old setup is just in the way", "it catches up"],
    ["you know the feeling", "you know how that goes", "look… we have all been there"],
    ["deliver", "delivery is handled"],
    ["sale", "percent off"],
  ];

  return clusters.some((cluster) => cluster.some((term) => x.includes(term)) && cluster.some((term) => y.includes(term)));
}

function canFollow(prev, next, brand) {
  const a = s(prev).toLowerCase();
  const b = s(next).toLowerCase();

  if (!b) return false;
  if (!a) return true;
  if (a === b) return false;

  if (lineMentionsBrand(prev, brand) && lineMentionsBrand(next, brand)) {
    return false;
  }

  if (lineIsExplanation(prev) && lineMentionsBrand(next, brand)) {
    return false;
  }

  if (lineIsOffer(prev) && lineIsOffer(next)) {
    return false;
  }

  if (lineIsDelivery(prev) && lineIsDelivery(next)) {
    return false;
  }

  if (sameIdea(prev, next)) {
    return false;
  }

  return true;
}

function cleanupFlow(script, brand) {
  const out = [];

  for (const raw of script) {
    const line = s(raw);
    if (!line) continue;
    if (isWeakLine(line)) continue;

    const prev = out[out.length - 1] || "";

    if (!canFollow(prev, line, brand)) continue;

    out.push(line);
  }

  return uniqueLines(out);
}

function pickStoryBeats(count) {
  return shuffle(STORY_BEATS).slice(0, count);
}

function buildOfferLine(input) {
  return s(input.offer);
}

function buildDetailLines(input, max = 2) {
  const rawDetails = uniqueLines(lines(input.details))
    .map(speakableDetail)
    .filter(Boolean)
    .filter((line) => !isWeakLine(line));

  const out = [];
  const used = new Set();

  for (const detail of rawDetails) {
    const key = detail.toLowerCase();
    if (used.has(key)) continue;
    used.add(key);
    out.push(detail);
    if (out.length >= max) break;
  }

  return out;
}

function maybeFuseOfferAndDetail(offer, details) {
  const offerLine = s(offer);
  const firstDetail = s(details[0]);

  if (!offerLine) {
    return { offerLine: "", remainingDetails: details };
  }

  if (!firstDetail) {
    return { offerLine, remainingDetails: details };
  }

  const offerLower = offerLine.toLowerCase();
  const detailLower = firstDetail.toLowerCase();

  if (offerLower.includes("sale") && detailLower.includes("percent")) {
    return {
      offerLine: `${offerLine} — ${firstDetail}`,
      remainingDetails: details.slice(1),
    };
  }

  if (offerLower.includes("sale") && detailLower.includes("weekend")) {
    return {
      offerLine: `${offerLine} ${firstDetail.toLowerCase()}`,
      remainingDetails: details.slice(1),
    };
  }

  return {
    offerLine,
    remainingDetails: details,
  };
}

function buildCtaLine(input) {
  return s(input.cta) || s(input.brand);
}

function retailProblem() {
  return pick([
    "At some point the old setup is just in the way",
    "Sooner or later you stop patching it and replace it",
    "Funny how the room starts telling on itself",
  ]);
}

function retailAside() {
  return pick([
    "Look… we have all been there",
    "That usually happens fast",
  ]);
}

function retailSupportAfterOffer() {
  return pick([
    "And yes — they will deliver it",
    "And yes — delivery is handled",
  ]);
}

function retailClose(brand, cta) {
  const closePool = uniqueLines([
    s(cta),
    s(brand),
    `${brand}.`,
  ]).filter(Boolean);

  return pick(closePool);
}

function assembleRetailScript({ input, duration }) {
  const situation = buildSituation(input);
  const offer = buildOfferLine(input);
  const rawDetails = buildDetailLines(
    input,
    duration === 60 ? 4 : duration === 15 ? 1 : 2
  );
  const { offerLine, remainingDetails } = maybeFuseOfferAndDetail(offer, rawDetails);
  const cta = buildCtaLine(input);

  const deliveryLine =
    remainingDetails.find((line) => lineIsDelivery(line)) || retailSupportAfterOffer();

  const weekendLine =
    remainingDetails.find((line) => lineIsWeekend(line) && !lineIsDelivery(line)) || "";

  const extraDetail =
    remainingDetails.find(
      (line) =>
        !lineIsDelivery(line) &&
        !lineIsWeekend(line) &&
        !lineIsOffer(line)
    ) || "";

  const script = [situation];

  if (duration === 15) {
    script.push(retailProblem());
    if (offerLine) script.push(offerLine);
    if (deliveryLine) script.push(deliveryLine);
    script.push(retailClose(input.brand, cta));
    return cleanupFlow(script, input.brand);
  }

  if (duration === 30) {
    script.push(retailProblem());

    if (Math.random() > 0.55) {
      script.push(retailAside());
    }

    if (offerLine) script.push(offerLine);
    if (deliveryLine) script.push(deliveryLine);

    if (weekendLine && Math.random() > 0.6) {
      script.push(weekendLine);
    }

    script.push(retailClose(input.brand, cta));
    return cleanupFlow(script, input.brand);
  }

  script.push(retailProblem());

  if (Math.random() > 0.5) {
    script.push(retailAside());
  }

  if (offerLine) script.push(offerLine);
  if (deliveryLine) script.push(deliveryLine);

  if (extraDetail) {
    script.push(extraDetail);
  } else if (weekendLine) {
    script.push(weekendLine);
  }

  script.push(retailClose(input.brand, cta));

  return cleanupFlow(script, input.brand);
}

function assembleGenericScript({ input, duration }) {
  const situation = buildSituation(input);
  const beatCount = duration === 15 ? 2 : duration === 60 ? 4 : 3;
  const beatTypes = pickStoryBeats(beatCount);
  const beats = beatTypes.map((b) => buildBeat(b, input)).filter(Boolean);

  const offer = buildOfferLine(input);
  const rawDetails = buildDetailLines(
    input,
    duration === 60 ? 4 : duration === 15 ? 1 : 2
  );
  const { offerLine, remainingDetails } = maybeFuseOfferAndDetail(offer, rawDetails);
  const cta = buildCtaLine(input);

  const script = [situation];

  if (beats[0]) script.push(beats[0]);
  if (beats[1]) script.push(beats[1]);

  if (offerLine) script.push(offerLine);
  if (remainingDetails[0]) script.push(remainingDetails[0]);

  if (duration === 60) {
    if (beats[2]) script.push(beats[2]);
    if (remainingDetails[1]) script.push(remainingDetails[1]);
    if (beats[3]) script.push(beats[3]);
    if (remainingDetails[2]) script.push(remainingDetails[2]);
    if (remainingDetails[3]) script.push(remainingDetails[3]);
  } else if (duration === 30) {
    if (beats[2]) script.push(beats[2]);
    if (remainingDetails[1]) script.push(remainingDetails[1]);
  }

  if (cta) script.push(cta);

  return cleanupFlow(script, input.brand);
}

function assembleScript({ input, duration }) {
  const ctx = buildContext(input);

  if (ctx.retail) {
    return assembleRetailScript({ input, duration });
  }

  return assembleGenericScript({ input, duration });
}

function build15(input) {
  return assembleScript({ input, duration: 15 })
    .map(ensurePeriod)
    .join("\n");
}

function build30(input) {
  return assembleScript({ input, duration: 30 })
    .map(ensurePeriod)
    .join("\n");
}

function build60(input) {
  return assembleScript({ input, duration: 60 })
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

    let script;

    if (duration === 15) script = build15(input);
    else if (duration === 60) script = build60(input);
    else script = build30(input);

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
}
