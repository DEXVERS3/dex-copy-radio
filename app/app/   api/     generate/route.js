import { NextResponse } from "next/server";

/**
 * DEX RADIO — route.js (safe mode + radio-read formatting)
 * Always returns JSON. Never breaks UI.
 * Produces :15/:30/:60 scripts and formats numbers/URLs/phones for spoken timing.
 */

// ---------- RADIO READ FORMATTER (v1) ----------
const ONES = ["zero","one","two","three","four","five","six","seven","eight","nine"];
const TEENS = ["ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"];
const TENS = ["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"];

function intToWords(n) {
  if (!Number.isFinite(n) || n < 0) return String(n);
  if (n < 10) return ONES[n];
  if (n < 20) return TEENS[n - 10];
  if (n < 100) {
    const t = Math.floor(n / 10), r = n % 10;
    return r ? `${TENS[t]} ${ONES[r]}` : TENS[t];
  }
  if (n < 1000) {
    const h = Math.floor(n / 100), r = n % 100;
    return r ? `${ONES[h]} hundred ${intToWords(r)}` : `${ONES[h]} hundred`;
  }
  if (n < 10000) {
    const th = Math.floor(n / 1000), r = n % 1000;
    return r ? `${ONES[th]} thousand ${intToWords(r)}` : `${ONES[th]} thousand`;
  }
  return String(n);
}

function digitToWord(d) {
  return ONES[Number(d)] ?? d;
}

function spellDigitsWithDots(digits) {
  return digits.split("").map(digitToWord).join(". ") + ".";
}

function twoDigitRead(n) {
  const num = Number(n);
  if (Number.isNaN(num)) return n;
  if (num < 10) return ONES[num];
  if (num < 20) return TEENS[num - 10];
  const t = Math.floor(num / 10), r = num % 10;
  return r ? `${TENS[t]}-${ONES[r]}` : TENS[t];
}

function moneyToRadioWords(match, dollars, cents) {
  const d = Number(dollars);
  if (!Number.isFinite(d)) return match;
  const dWords = intToWords(d);
  const cWords = cents ? twoDigitRead(cents) : "";
  return cents ? `${dWords} ${cWords}` : dWords;
}

function decimalToRadioWords(match, whole, frac) {
  const w = Number(whole);
  if (!Number.isFinite(w)) return match;
  const wholeWords = intToWords(w);
  const fracWords = frac.split("").map(digitToWord).join(" ");
  return `${wholeWords} point ${fracWords}`;
}

function timeToRadioWords(match, h, m) {
  const hour = Number(h);
  const min = Number(m);
  if (!Number.isFinite(hour) || !Number.isFinite(min)) return match;

  const hourWords = intToWords(hour);
  if (m === "00") return `${hourWords} o'clock`;
  if (min < 10) return `${hourWords} oh ${intToWords(min)}`;

  const minWords = intToWords(min).replace(/\s+/g, "-");
  return `${hourWords}-${minWords}`;
}

function phoneToRadioWords(_match, areaOrPrefix, prefix, line) {
  const part1 = spellDigitsWithDots(areaOrPrefix);
  const part2 = spellDigitsWithDots(prefix);

  const pair1 = line.slice(0, 2).split("").map(digitToWord).join("-");
  const pair2 = line.slice(2, 4).split("").map(digitToWord).join("-");

  return `${part1} ${part2} ${pair1}. ${pair2}.`;
}

function urlToRadioWords(url) {
  let u = url.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  const [host, ...pathParts] = u.split("/");

  const hostSpoken = host.replace(/\./g, "-dot-");
  const pathSpoken = pathParts
    .filter(Boolean)
    .map(p => p.replace(/\./g, "-dot-").replace(/-/g, "-").replace(/_/g, "-"));

  if (pathSpoken.length === 0) return hostSpoken;
  return `${hostSpoken} slash ${pathSpoken.join(" slash ")}`;
}

function radioReadFormat(text) {
  if (!text) return text;
  let out = text;

  // URLs
  out = out.replace(/\bhttps?:\/\/[^\s)]+/gi, (m) => urlToRadioWords(m));
  out = out.replace(/\b([a-z0-9-]+)\.(com|net|org|io|co|biz|info|edu)\b/gi, (m) => urlToRadioWords(m));

  // Money
  out = out.replace(/\$(\d+)(?:\.(\d{2}))?\b/g, moneyToRadioWords);

  // Time
  out = out.replace(/\b(\d{1,2}):(\d{2})\b/g, timeToRadioWords);

  // Decimals / frequencies
  out = out.replace(/\b(\d+)\.(\d+)\b/g, decimalToRadioWords);

  // Phone (10-digit with separators)
  out = out.replace(/\b(?:\(?(\d{3})\)?[-.\s]?)?(\d{3})[-.\s]?(\d{4})\b/g, (m, area, pfx, line) => {
    if (!area) return m; // don't touch 7-digit here
    return phoneToRadioWords(m, area, pfx, line);
  });

  // Remaining integers
  out = out.replace(/\b\d+\b/g, (m) => {
    const n = Number(m);
    if (!Number.isSafeInteger(n)) return m;
    if (n > 9999) return m;
    return intToWords(n);
  });

  return out;
}
// ---------- END FORMATTER ----------

function pickDuration(body) {
  const d = body?.duration ?? body?.seconds ?? body?.time ?? body?.mode;
  const n = Number(d);
  if (n === 15 || n === 30 || n === 60) return n;
  return 30;
}

function safeStr(v) {
  return typeof v === "string" ? v.trim() : "";
}

function buildBrief(body) {
  const brief = body?.brief && typeof body.brief === "object" ? body.brief : {};
  return {
    brand: safeStr(body?.brand) || safeStr(brief.brand),
    offer: safeStr(body?.offer) || safeStr(brief.offer),
    audience: safeStr(body?.audience) || safeStr(brief.audience),
    tone: safeStr(body?.tone) || safeStr(brief.tone) || "confident, human, not salesy",
    cta: safeStr(body?.cta) || safeStr(brief.cta),
    mustSay: safeStr(body?.mustSay) || safeStr(brief.mustSay),
  };
}

function makeRadioScript({ duration, input, brief }) {
  const lines = [];
  const brand = brief.brand || "[BRAND]";
  const offer = brief.offer || "[OFFER]";
  const audience = brief.audience || "[AUDIENCE]";
  const cta = brief.cta || "[CTA]";
  const mustSay = brief.mustSay;

  lines.push(`:${duration} RADIO SCRIPT`);
  lines.push(`HOOK: ${offer} — for ${audience}.`);
  lines.push(duration >= 30 ? `${brand} makes it easy: ${offer}.` : `${brand}. ${offer}.`);
  lines.push(input ? input : "Add one clear benefit and one proof point.");
  lines.push(`CTA: ${cta}.`);
  if (mustSay) lines.push(`MUST-SAY: ${mustSay}`);

  return lines.join("\n");
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));

    const input = safeStr(body?.text) || safeStr(body?.prompt) || safeStr(body?.input);
    const duration = pickDuration(body);
    const brief = buildBrief(body);

    const script = makeRadioScript({ duration, input, brief });
    const finalScript = radioReadFormat(script);

    return NextResponse.json({
      ok: true,
      output: finalScript,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Dex Radio API error (safe mode)" },
      { status: 500 }
    );
  }
}
