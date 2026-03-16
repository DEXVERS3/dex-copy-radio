import { NextResponse } from "next/server";

export const runtime = "nodejs";

const VERSION = "[[DEX_ENGINE_V7_PREMISE_AWARE]]";

const TARGET_WORDS = {
  15: { min: 28, max: 42 },
  30: { min: 60, max: 85 },
  60: { min: 125, max: 155 },
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
  return s(input.brand) || s(input.offer) || "the event";
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
    .replace(/\s+/g, " ")
    .replace(/\.\s*,/g, ". ")
    .replace(/!\s*,/g, "! ")
    .replace(/\?\s*,/g, "? ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,+/g, ", ")
    .replace(/\s*\.\s*\./g, ".")
    .replace(/\bn\b(?=\s+formal\b)/gi, "no")
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

function details(input) {
  return splitDetailFragments(input.details);
}

function joinNatural(parts) {
  const list = parts.map(cleanupText).filter(Boolean);

  if (!list.length) return "";
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  if (list.length === 3) return `${list[0]}, ${list[1]}, and ${list[2]}`;

  return `${list[0]}, ${list[1]}, ${list[2]}, and ${list.slice(3).join(", ")}`;
}

function classifyPremise(input) {
  const blob = [
    s(input.brand),
    s(input.offer),
    s(input.details),
    s(input.cta)
  ]
    .join(" ")
    .toLowerCase();

  const absurdWords = [
    "unreliable",
    "stooges",
    "not even real",
    "not gonna",
    "probably not getting your money's worth",
    "couple of stooges"
  ];

  const eventWords = [
    "festival", "fair", "concert", "show", "parade", "celebration",
    "weekend", "crafts", "live music", "ride free", "admission",
    "tickets", "food", "games", "event", "annual"
  ];

  const retailWords = [
    "sale", "save", "clearance", "discount", "off", "sectional",
    "furniture", "mattress", "inventory", "financing", "showroom",
    "weekend only", "deliver", "delivery available", "shop"
  ];

  const serviceWords = [
    "service", "repair", "law", "lawyer", "attorney", "legal",
    "clinic", "doctor", "dentist", "roofing", "plumbing", "hvac",
    "insurance", "consultation", "call today", "book now"
  ];

  if (absurdWords.some((w) => blob.includes(w))) return "absurd";
  if (eventWords.some((w) => blob.includes(w))) return "event";
  if (retailWords.some((w) => blob.includes(w))) return "retail";
  if (serviceWords.some((w) => blob.includes(w))) return "service";

  return "general";
}

function opening(sub, input, duration, premise) {
  const offer = s(input.offer) ? speakable(input.offer) : "";

  if (premise === "event") {
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

  if (premise === "retail") {
    if (offer) {
      return [
        pick([
          "Sooner or later the hunt for a deal gets serious",
          "Funny how the right deal usually shows up when you need it",
          "There comes a point where looking turns into buying"
        ]),
        `${sub} has ${offer.toLowerCase()}`
      ];
    }

    return [
      pick([
        "Sooner or later the hunt for a deal gets serious",
        "Funny how the right deal usually shows up when you need it",
        `That is usually when people end up at ${sub}`
      ])
    ];
  }

  if (premise === "service") {
    if (offer) {
      return [
        pick([
          "Usually the problem is not whether you need help",
          "There comes a point when putting it off stops helping",
          "Most people wait until the issue refuses to wait with them"
        ]),
        `${sub} has ${offer.toLowerCase()}`
      ];
    }

    return [
      pick([
        "Usually the problem is not whether you need help",
        "There comes a point when putting it off stops helping",
        `That is usually when people call ${sub}`
      ])
    ];
  }

  if (premise === "absurd") {
    const first = pick([
      `This is your invitation to ${sub}`,
      `Well, at least ${sub} is being honest`,
      `There is something to be said for a business that tells you exactly what it is`
    ]);

    if (offer) return [first, offer];
    return [first];
  }

  if (offer) {
    return [
      pick([
        `Here is the thing about ${sub}`,
        `Sooner or later people notice ${sub}`,
        `This is where ${sub} starts to make sense`
      ]),
      offer
    ];
  }

  return [
    pick([
      `Here is the thing about ${sub}`,
      `Sooner or later people notice ${sub}`,
      `This is where ${sub} starts to make sense`
    ])
  ];
}

function detailLead(premise, sub) {
  if (premise === "event") {
    return pick([
      "You hear that and the day starts to picture itself",
      "That is usually enough to make the plan for you",
      `That is how days like ${sub} start coming together`
    ]);
  }

  if (premise === "retail") {
    return pick([
      "Now we are getting somewhere",
      "That usually gets a person's attention",
      "And that is where the decision starts getting easier"
    ]);
  }

  if (premise === "service") {
    return pick([
      "That is the part people actually need to hear",
      "That is when the right call starts to look obvious",
      "At that point, the decision is not exactly mysterious"
    ]);
  }

  if (premise === "absurd") {
    return pick([
      "And just to be clear, they are not overselling this thing",
      "There is no mystery here, which is almost refreshing",
      "You do have to respect the honesty"
    ]);
  }

  return pick([
    "That starts to paint the picture",
    "That is where it starts to make sense",
    "Now the whole thing starts to come together"
  ]);
}

function buildSupportLines(det, duration, premise, sub) {
  if (!det.length) return [];

  const maxLines = duration === 15 ? 2 : duration === 30 ? 4 : 7;
  const out = [];

  out.push(detailLead(premise, sub));

  let i = 0;
  while (i < det.length && out.length < maxLines) {
    const remainingLines = maxLines - out.length;
    const remainingDetails = det.length - i;

    if (remainingLines === 1) {
      out.push(joinNatural(det.slice(i)));
      break;
    }

    if (duration === 15) {
      out.push(joinNatural(det.slice(i, i + 2)));
      i += 2;
      continue;
    }

    if (duration === 30) {
      const take = remainingDetails >= 3 ? 2 : 1;
      out.push(joinNatural(det.slice(i, i + take)));
      i += take;
      continue;
    }

    const take = remainingDetails >= 5 ? 2 : 1;
    out.push(joinNatural(det.slice(i, i + take)));
    i += take;
  }

  return unique(out);
}

function act3(sub, premise) {
  if (premise === "event") {
    return pick([
      "That is the kind of weekend people look forward to",
      "That sounds like a pretty good way to spend a day",
      `That is why people make time for ${sub}`,
      `That is what makes ${sub} worth the trip`
    ]);
  }

  if (premise === "retail") {
    return pick([
      `That is usually how people end up at ${sub}`,
      "That is not a bad reason to make the move",
      "That is when the smart money stops waiting",
      "That is usually all the convincing a person needs"
    ]);
  }

  if (premise === "service") {
    return pick([
      `That is usually why people call ${sub}`,
      "That is the moment the right move gets pretty obvious",
      "That is not exactly the kind of thing you keep putting off",
      "That is usually when the next step makes itself"
    ]);
  }

  if (premise === "absurd") {
    return pick([
      `That is why people make time for ${sub}`,
      "Honestly, the straight answer is doing a lot of work here",
      "You may not trust the pitch, but at least the pitch is honest",
      "At some point, brutal honesty becomes the selling point"
    ]);
  }

  return pick([
    `That is usually how people end up at ${sub}`,
    "That is where the whole thing starts to land",
    "That is usually all the convincing a person needs",
    "That is when the decision starts to make itself"
  ]);
}

function closing(sub, input) {
  const cta = s(input.cta) ? speakable(input.cta) : "";

  if (cta) return cta;

  return `Visit ${sub}`;
}

function expansionLines(sub, premise, duration) {
  if (premise === "event") {
    const short = [
      "Bring the family",
      "Make plans now",
      "You can already hear how the day goes"
    ];

    const medium = [
      "Bring the family",
      "Make plans now",
      "This is one of those weekends",
      "You do not want to miss this one",
      `That is how weekends like ${sub} earn a crowd`,
      "Once you hear that, the plan usually makes itself",
      "Food and music have a way of filling up a day",
      "That is when the weekend starts to picture itself"
    ];

    const long = [
      ...medium,
      "A good festival has a way of taking over the whole day",
      "That is usually when the calendar starts to make room for it",
      "It just sounds like the kind of day people want to have",
      "A lot of good weekends start exactly like that",
      "That is usually all the convincing a person needs",
      "You can already hear how the day goes"
    ];

    return duration === 15 ? short : duration === 30 ? medium : long;
  }

  if (premise === "retail") {
    const short = [
      "That will usually do it",
      "Now the choice starts looking easier",
      "That tends to get a room's attention"
    ];

    const medium = [
      "That will usually do it",
      "Now the choice starts looking easier",
      "That tends to get a room's attention",
      "A good deal has a way of speeding up the decision",
      "This is usually where browsing starts to end",
      "You wait long enough and somebody else buys it first",
      "That is when the smart move starts to look obvious",
      `That is how places like ${sub} earn traffic`
    ];

    const long = [
      ...medium,
      "At some point, the math starts doing the talking",
      "You can only think about it for so long",
      "That is usually where hesitation starts losing ground",
      "The right offer has a way of closing the gap",
      "That is the difference between looking and deciding",
      "A deal is only a deal if you move on it"
    ];

    return duration === 15 ? short : duration === 30 ? medium : long;
  }

  if (premise === "service") {
    const short = [
      "That part matters",
      "Now the next step is pretty obvious",
      "That is usually what gets people moving"
    ];

    const medium = [
      "That part matters",
      "Now the next step is pretty obvious",
      "That is usually what gets people moving",
      "The problem rarely fixes itself for free",
      "Putting it off has a way of getting expensive",
      "This is when a real solution starts sounding good",
      `That is how businesses like ${sub} earn the call`,
      "At that point, waiting is not exactly a strategy"
    ];

    const long = [
      ...medium,
      "That is when the practical move becomes the right move",
      "Most people know the answer before they say it out loud",
      "There is only so long you can stare at a problem",
      "Eventually, the fix becomes the plan",
      "And once you get there, the call tends to make itself",
      "That is usually how the delay comes to an end"
    ];

    return duration === 15 ? short : duration === 30 ? medium : long;
  }

  if (premise === "absurd") {
    const short = [
      "They did not exactly bury the lead",
      "There is no confusion in the pitch",
      "You cannot say they oversold it"
    ];

    const medium = [
      "They did not exactly bury the lead",
      "There is no confusion in the pitch",
      "You cannot say they oversold it",
      "At some point, honesty becomes a kind of strategy",
      "Even a ridiculous offer lands better when it sounds self-aware",
      "There is a weird amount of confidence in saying the quiet part out loud",
      "And somehow, that is what makes people listen",
      "The straight-faced nonsense is doing its job"
    ];

    const long = [
      ...medium,
      "There is something almost respectable about telling on yourself up front",
      "A lot of ads would be better if they were this honest",
      "The joke lands harder when nobody blinks",
      "And yes, somehow that becomes the point",
      "Once the premise commits, the copy has to commit with it",
      "That is where the whole thing stops sounding accidental"
    ];

    return duration === 15 ? short : duration === 30 ? medium : long;
  }

  const short = [
    "That starts to make the case",
    "Now the picture gets clearer",
    "That is usually enough to get attention"
  ];

  const medium = [
    "That starts to make the case",
    "Now the picture gets clearer",
    "That is usually enough to get attention",
    "This is where the thing starts to land",
    "A good idea usually gets simpler as it goes",
    "That is when the choice starts to come into focus",
    `That is how ${sub} starts to stand out`,
    "At that point, the move is not hard to see"
  ];

  const long = [
    ...medium,
    "That is when the shape of it gets obvious",
    "Most decisions do not need much more than that",
    "The right message usually knows when to stop pushing",
    "And once it lands, it tends to stay landed",
    "That is the point where the next step gets easy",
    "A clear case has a way of making itself"
  ];

  return duration === 15 ? short : duration === 30 ? medium : long;
}

function expand(base, duration, sub, premise) {
  const wordTarget = TARGET_WORDS[duration];
  const lineTarget = TARGET_LINES[duration];
  const script = [...base];
  const extras = expansionLines(sub, premise, duration);

  for (const line of extras) {
    const enoughWords = totalWords(script) >= wordTarget.min;
    const enoughLines = script.length >= lineTarget.min;

    if (enoughWords && enoughLines) break;

    script.splice(Math.max(script.length - 1, 1), 0, line);
  }

  return script;
}

function buildScript(input, duration) {
  const sub = speakable(subject(input));
  const det = details(input);
  const premise = classifyPremise(input);

  const act1 = opening(sub, input, duration, premise);
  const support = buildSupportLines(det, duration, premise, sub);
  const actThree = act3(sub, premise);
  const close = closing(sub, input);

  let script = [
    ...act1,
    ...support,
    actThree,
    close
  ].filter(Boolean);

  script = expand(script, duration, sub, premise);

  script = unique(
    script
      .map(speakable)
      .map(cleanupText)
      .filter(Boolean)
  );

  script = script.map(ensurePeriod);

  const maxLines = TARGET_LINES[duration].max;
  if (script.length > maxLines) {
    const last = script[script.length - 1];
    const body = script.slice(0, maxLines - 1);
    script = [...body, last];
  }

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
