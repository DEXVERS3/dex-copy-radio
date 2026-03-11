import { NextResponse } from "next/server";

export const runtime = "nodejs";

const VERSION = "[[DEX_RADIO_STORY_ENGINE]]";

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

function spellLetters(text) {
  return String(text)
    .toLowerCase()
    .split("")
    .map((ch) => (/[a-z]/.test(ch) ? ch : ch))
    .join(" ");
}

function formatWebsiteDomain(domain) {
  const parts = String(domain).toLowerCase().split(".");
  return parts
    .map((part, index) => {
      if (index === 0) {
        if (/^[a-z]+$/.test(part)) {
          return part.split("").join(" ");
        }
        return part;
      }
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

function ensureMustSay(script, mustSay) {
  const ms = s(mustSay);
  if (!ms) return script;
  return `${script}\n${ms}`;
}

function act1Scene(brand, audience) {
  const options = [
    `You know that moment when you realize the day just got better`,
    `Some days just need a place to land`,
    `Every city has that one spot`,
    `Here’s how a good day usually starts`,
  ];

  const base = options[Math.floor(Math.random() * options.length)];
  if (audience) return `${base} for ${audience}`;
  return base;
}

function act2Turn(offer, details) {
  const d = lines(details)[0];

  if (offer && d) return `${offer}. ${d}`;
  if (offer) return offer;
  if (d) return d;

  return "That’s where things get interesting";
}

function act3Resolution(brand, cta) {
  if (cta) return cta;
  return `That’s ${brand}`;
}

function build15({ brand, offer, audience, cta, details }) {
  const a1 = act1Scene(brand, audience);
  const a2 = act2Turn(offer, details);
  const a3 = act3Resolution(brand, cta);

  return [a1, a2, a3].map(ensurePeriod).join("\n");
}

function build30({ brand, offer, audience, cta, details }) {
  const a1 = act1Scene(brand, audience);
  const a2 = act2Turn(offer, details);
  const a3 = act3Resolution(brand, cta);
  const extra = lines(details)[1];

  const out = [a1];
  if (a2) out.push(a2);
  if (extra) out.push(extra);
  out.push(a3);

  return out.map(ensurePeriod).join("\n");
}

function build60({ brand, offer, audience, cta, details }) {
  const d = lines(details);

  const a1 = act1Scene(brand, audience);
  const a2 = act2Turn(offer, details);
  const a3 = act3Resolution(brand, cta);

  const out = [a1];
  if (a2) out.push(a2);

  for (let i = 0; i < Math.min(d.length, 3); i++) {
    out.push(d[i]);
  }

  out.push(a3);

  return out.map(ensurePeriod).join("\n");
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const duration = pickDuration(body);

    const brand = s(body.brand) || "YOUR BRAND";
    const offer = s(body.offer);
    const audience = s(body.audience);
    const cta = s(body.cta);
    const mustSay = s(body.mustSay);
    const details = s(body.details || body.text);

    let script =
      duration === 15
        ? build15({ brand, offer, audience, cta, details })
        : duration === 30
        ? build30({ brand, offer, audience, cta, details })
        : build60({ brand, offer, audience, cta, details });

    script = formatBroadcastCopy(script);
    script = ensureMustSay(script, formatBroadcastCopy(mustSay));

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
