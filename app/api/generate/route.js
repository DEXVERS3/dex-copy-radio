import { NextResponse } from "next/server";

export const runtime = "nodejs";

const VERSION = "[[DEX_RADIO_CONVERSATION_ENGINE_V10]]";

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
      "sofa",
      "couch",
      "recliner",
      "living room",
      "bedroom",
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
    furniture: containsAny(blob, [
      "furniture",
      "sectional",
      "sectionals",
      "sofa",
      "couch",
      "recliner",
      "mattress",
      "bedroom",
      "living room",
      "dining room",
    ]),
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
        "At some point the old setup is just in the way",
        "Sooner or later the room is due",
        "Once you see it, you cannot unsee it",
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

function lineIsRecognition(line) {
  const lower = s(line).toLowerCase();
  return (
    lower.includes("that room has been asking for help") ||
    lower.includes("you can only look at that couch for so long") ||
    lower.includes("the whole room starts leaning on you") ||
    lower.includes("that part happens fast") ||
    lower.includes("soon enough, the whole thing starts to look tired") ||
    lower.includes("you can feel it when the setup is done")
  );
}

function sameIdea(prev, next) {
  const a = s(prev).toLowerCase();
  const b = s(next).toLowerCase();

  if (!a || !b) return false;

  if (lineIsDelivery(prev) && lineIsDelivery(next)) return true;
  if (lineIsOffer(prev) && lineIsOffer(next)) return true;
  if (lineIsRecognition(prev) && lineIsRecognition(next)) return true;

  return false;
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

function clampLines(script, duration, brand) {
  const target = TARGET_LINES[duration];
  const cleaned = cleanupFlow(script, brand);
  return cleaned.slice(0, target.max);
}

function expandToTarget(baseLines, candidateLines, duration, brand) {
  const target = TARGET_LINES[duration];
  let out = clampLines(baseLines, duration, brand);

  const candidates = uniqueLines(candidateLines).filter(Boolean);

  for (const candidate of candidates) {
    if (out.length >= target.min) break;

    const next = clampLines([...out, candidate], duration, brand);
    if (next.length > out.length) {
      out = next;
    }
  }

  return out.slice(0, target.max);
}

function buildOfferLine(input) {
  return s(input.offer);
}

function buildDetailLines(input, max = 8) {
  const rawDetails = uniqueLines(lines(input.details))
    .map(speakableDetail)
    .filter(Boolean)
    .filter((line) => !isWeakLine(line));

  return rawDetails.slice(0, max);
}

function buildMustSayLines(input) {
  return uniqueLines(lines(input.mustSay))
    .map(speakableDetail)
    .filter(Boolean)
    .filter((line) => !isWeakLine(line));
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

function retailProblem(input) {
  const ctx = buildContext(input);

  if (ctx.furniture) {
    return pick([
      "Sooner or later the room is due",
      "At some point the old couch has had its say",
      "Once you see it, you cannot unsee it",
    ]);
  }

  return pick([
    "At some point the old setup is just in the way",
    "Sooner or later the room is due",
    "Once you see it, you cannot unsee it",
  ]);
}

function retailRecognition(input) {
  const ctx = buildContext(input);

  if (ctx.furniture) {
    return pick([
      "That room has been asking for help",
      "You can only look at that couch for so long",
      "At some point the whole room starts leaning on you",
    ]);
  }

  return pick([
    "That part happens fast",
    "You can feel it when the setup is done",
    "Soon enough, the whole thing starts to look tired",
  ]);
}

function retailObservation(input) {
  const ctx = buildContext(input);

  if (ctx.furniture) {
    return pick([
      "One tired piece will do that to a room",
      "The whole room changes when the right piece shows up",
      "That is how one good replacement turns into a whole-room move",
    ]);
  }

  return pick([
    "That is when the whole thing starts to look dated",
    "That is usually where the move gets made",
    "That is how browsing turns serious",
  ]);
}

function retailExpansion(input) {
  const ctx = buildContext(input);

  if (ctx.furniture) {
    return pick([
      "You walk in one day and the room gives itself away",
      "That is when browsing turns into buying",
      "Once the room feels tired, you stop arguing with it",
      "That is usually how the whole thing starts",
    ]);
  }

  return pick([
    "Soon enough, browsing turns into a real plan",
    "That is where the fix starts looking obvious",
    "That is usually when the whole thing turns",
  ]);
}

function retailSupportAfterOffer() {
  return pick([
    "And yes — they will deliver it",
    "And yes — delivery is handled",
  ]);
}

function retailUrgency() {
  return pick([
    "This weekend only",
    "This weekend is the move",
    "That part does not last forever",
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

function buildRetailSupportBank(input) {
  const ctx = buildContext(input);
  const bank = [];

  if (ctx.furniture) {
    bank.push(
      "One good sectional changes the whole room",
      "That is how the room starts feeling right again",
      "The right piece tends to solve more than one problem",
      "That is what a real reset looks like",
      "A room upgrade has a way of paying off fast"
    );
  } else {
    bank.push(
      "That is how the better setup starts",
      "One strong move fixes a lot at once",
      "That is usually the difference-maker"
    );
  }

  return bank;
}

function buildGenericExpansionBank(input) {
  const ctx = buildContext(input);
  const bank = [];

  if (ctx.mattress) {
    bank.push(
      "Funny how sleep gets your attention when it disappears",
      "Your back usually votes first",
      "That is where the smarter move starts"
    );
  } else if (ctx.auto) {
    bank.push(
      "That is when the small issue stops being small",
      "Ignoring it does not usually make it cheaper",
      "That part tends to catch up fast"
    );
  } else if (ctx.foodDrink) {
    bank.push(
      "That is usually when the night starts turning into a story",
      "Some places just know how to keep it moving",
      "That is where the energy changes"
    );
  } else {
    bank.push(
      "That is usually where the move gets made",
      "That is when the idea starts looking obvious",
      "That part tends to happen fast"
    );
  }

  return bank;
}

function assembleRetailScript({ input, duration }) {
  const target = TARGET_LINES[duration];
  const offer = buildOfferLine(input);
  const details = buildDetailLines(input, duration === 60 ? 10 : duration === 30 ? 6 : 3);
  const mustSay = buildMustSayLines(input);
  const { offerLine, remainingDetails } = maybeFuseOfferAndDetail(offer, details);
  const cta = buildCtaLine(input);

  const setup = buildSituation(input);
  const problem = retailProblem(input);
  const recognition = retailRecognition(input);
  const observation = retailObservation(input);
  const expansion = retailExpansion(input);
  const deliveryLine =
    remainingDetails.find((line) => lineIsDelivery(line)) || retailSupportAfterOffer();
  const urgencyLine =
    remainingDetails.find((line) => lineIsWeekend(line) && !lineIsDelivery(line)) || retailUrgency();
  const closeLine = retailClose(input.brand, cta);

  let base = [];

  if (duration === 15) {
    base = [
      setup,
      problem,
      offerLine,
      deliveryLine,
      closeLine,
    ];
  } else if (duration === 30) {
    base = [
      setup,
      problem,
      recognition,
      observation,
      offerLine,
      deliveryLine,
      ...remainingDetails.slice(0, 2),
      ...mustSay.slice(0, 1),
      urgencyLine,
      closeLine,
    ];
  } else {
    base = [
      setup,
      problem,
      recognition,
      observation,
      expansion,
      offerLine,
      deliveryLine,
      ...remainingDetails.slice(0, 5),
      ...mustSay.slice(0, 3),
      urgencyLine,
      closeLine,
    ];
  }

  const candidateBank = shuffle([
    ...buildRetailSupportBank(input),
    ...remainingDetails.slice(duration === 60 ? 5 : 2),
    ...mustSay.slice(duration === 60 ? 3 : 1),
    retailRecognition(input),
    retailObservation(input),
    retailExpansion(input),
    retailUrgency(),
    "That is where the better room starts",
    "That is where the weekend starts paying off",
    "The right move tends to show up all at once",
    "One good decision changes the room in a hurry",
  ]);

  let out = expandToTarget(base, candidateBank, duration, input.brand);

  if (out.length < target.min) {
    out = expandToTarget(
      out,
      [
        "That is where the room starts turning around",
        "One better piece changes the whole setup",
        "That is how the right move starts looking easy",
        "That is usually when people stop waiting",
        "That is where the smarter buy shows up",
      ],
      duration,
      input.brand
    );
  }

  return out.slice(0, target.max);
}

function assembleGenericScript({ input, duration }) {
  const target = TARGET_LINES[duration];
  const situation = buildSituation(input);
  const beatCount = duration === 15 ? 2 : duration === 30 ? 4 : 6;
  const beatTypes = shuffle(STORY_BEATS).slice(0, beatCount);
  const beats = beatTypes.map((b) => buildBeat(b, input)).filter(Boolean);

  const offer = buildOfferLine(input);
  const details = buildDetailLines(input, duration === 60 ? 8 : duration === 30 ? 4 : 2);
  const mustSay = buildMustSayLines(input);
  const { offerLine, remainingDetails } = maybeFuseOfferAndDetail(offer, details);
  const cta = buildCtaLine(input);

  let base = [];

  if (duration === 15) {
    base = [
      situation,
      ...beats.slice(0, 2),
      offerLine,
      ...remainingDetails.slice(0, 1),
      cta,
    ];
  } else if (duration === 30) {
    base = [
      situation,
      ...beats.slice(0, 4),
      offerLine,
      ...remainingDetails.slice(0, 2),
      ...mustSay.slice(0, 1),
      cta,
    ];
  } else {
    base = [
      situation,
      ...beats.slice(0, 6),
      offerLine,
      ...remainingDetails.slice(0, 4),
      ...mustSay.slice(0, 2),
      cta,
    ];
  }

  const candidateBank = shuffle([
    ...remainingDetails.slice(duration === 60 ? 4 : 2),
    ...mustSay.slice(duration === 60 ? 2 : 1),
    ...buildGenericExpansionBank(input),
    buildBeat("reaction", input),
    buildBeat("problem", input),
    buildBeat("aside", input),
    buildBeat("reinforcement", input),
    buildBeat("punchline", input),
  ]);

  let out = expandToTarget(base, candidateBank, duration, input.brand);

  if (out.length < target.min) {
    out = expandToTarget(
      out,
      [
        "That is where the smarter move starts",
        "That usually gets the point across",
        "That is when the better option shows up",
      ],
      duration,
      input.brand
    );
  }

  return out.slice(0, target.max);
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
      meta: {
        duration,
        version: VERSION,
        targetLines: TARGET_LINES[duration],
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
