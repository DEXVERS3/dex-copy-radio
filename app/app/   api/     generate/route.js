import { NextResponse } from "next/server";

/**
 * DEX RADIO — generate route (v1)
 * - Always returns JSON
 * - Accepts { mode: "15"|"30"|"60" } or { duration: 15|30|60 }
 * - Uses intake fields (brand/offer/audience/tone/cta/mustSay/details)
 * - If user provides little/no copy, it still writes a full spot
 * - Enforces approximate word targets per duration
 * - Formats shorthand for radio reads (money, time, decimals, phone, URLs, numbers)
 */

// -------------------- RADIO READ FORMATTER --------------------
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
function digitToWord(d) { return ONES[Number(d)] ?? d; }
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
function phoneToRadioWords(_match, a, b, c) {
  const part1 = spellDigitsWithDots(a);
  const part2 = spellDigitsWithDots(b);
  const pair1 = c.slice(0, 2).split("").map(digitToWord).join("-");
  const pair2 = c.slice(2, 4).split("").map(digitToWord).join("-");
  return `${part1} ${part2} ${pair1}. ${pair2}.`;
}
function urlToRadioWords(url) {
  let u = url.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  const [host, ...pathParts] = u.split("/");
  const hostSpoken = host.replace(/\./g, "-dot-");
  const pathSpoken = pathParts
    .filter(Boolean)
    .map(p => p.replace(/\./g, "-dot-").replace(/_/g, "-"));
  return pathSpoken.length ? `${hostSpoken} slash ${pathSpoken.join(" slash ")}` : hostSpoken;
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

  // Phone (10-digit)
  out = out.replace(/\b(?:\(?(\d{3})\)?[-.\s]?)?(\d{3})[-.\s]?(\d{4})\b/g, (m, area, pfx, line) => {
    if (!area) return m;
    return phoneToRadioWords(m, area, pfx, line);
  });

  // Remaining ints (limit)
  out = out.replace(/\b\d+\b/g, (m) => {
    const n = Number(m);
    if (!Number.isSafeInteger(n)) return m;
    if (n > 9999) return m;
    return intToWords(n);
  });

  return out;
}

// -------------------- HELPERS --------------------
function safeStr(v) {
  return typeof v === "string" ? v.trim() : "";
}

function pickDuration(body) {
  const d = body?.duration ?? body?.seconds ?? body?.time ?? body?.mode ?? body?.len;
  const n = Number(d);
  if (n === 15 || n === 30 || n === 60) return n;
  // allow ":30" etc
  if (typeof d === "string") {
    const m = d.match(/\b(15|30|60)\b/);
    if (m) return Number(m[1]);
  }
  return 30;
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
    details: safeStr(body?.details) || safeStr(brief.details) || safeStr(body?.text) || safeStr(body?.input) || safeStr(body?.prompt),
  };
}

function wordCount(s) {
  const t = safeStr(s);
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

function targetWords(duration) {
  // conversational radio read targets
  if (duration === 15) return { min: 35, max: 50 };
  if (duration === 30) return { min: 70, max: 90 };
  return { min: 140, max: 170 }; // 60
}

function joinClean(lines) {
  return lines
    .map(l => safeStr(l))
    .filter(Boolean)
    .join("\n");
}

function buildScript(duration, brief) {
  const brand = brief.brand || "[BRAND]";
  const offer = brief.offer || "[OFFER]";
  const audience = brief.audience || "[AUDIENCE]";
  const tone = brief.tone;
  const cta = brief.cta || "[CTA]";
  const mustSay = brief.mustSay;
  const details = brief.details;

  const lines = [];

  // Header (kept short; can be removed later)
  lines.push(`:${duration} RADIO COPY`);
  lines.push(`TONE: ${tone}`);

  // Hook
  // Make hook complete even with sparse brief
  if (offer !== "[OFFER]" && audience !== "[AUDIENCE]") {
    lines.push(`HOOK: ${offer} — built for ${audience}.`);
  } else if (offer !== "[OFFER]") {
    lines.push(`HOOK: ${offer}. Right now.`);
  } else {
    lines.push(`HOOK: Quick heads-up — this is worth your next stop.`);
  }

  // Body beats
  if (duration >= 30) {
    lines.push(`${brand} makes it easy: ${offer}.`);
    lines.push(`If you’re ${audience}, this is your move.`);
    lines.push(`Real talk: you want something that works without the runaround.`);
  } else {
    lines.push(`${brand}. ${offer}. Simple.`);
    lines.push(`Perfect for ${audience}.`);
  }

  // Add details / specials / location / schedule / proof
  if (details) {
    lines.push(`DETAILS: ${details}`);
  } else {
    // If user gave nothing, still provide a complete beat
    lines.push(`DETAILS: Ask for today’s special, and don’t overthink it — just go.`);
  }

  // Extra beat for :60
  if (duration === 60) {
    lines.push(`BEAT TWO: Picture it — you walk in, you know exactly what to order, and you’re smiling before the first bite.`);
    lines.push(`PROOF: It’s the kind of place you bring people back to.`);
  }

  // CTA
  lines.push(`CTA: ${cta}.`);
  lines.push(`${brand}.`);

  // Must-say
  if (mustSay) lines.push(`MUST-SAY: ${mustSay}`);

  return joinClean(lines);
}

function padToDuration(script, duration) {
  // If script is too short, add tasteful filler lines that still sound like radio,
  // not like an essay.
  const { min, max } = targetWords(duration);
  let out = script;

  const fillers = [
    `And if you’re tired of the same old, this is your switch-up.`,
    `It’s fast, it’s easy, and it hits the spot.`,
    `You’ll know you’re in the right place the second you walk in.`,
    `Bring a friend. Or don’t. Either way — you’re winning.`,
    `This is the part where you stop thinking and start going.`,
  ];

  let i = 0;
  while (wordCount(out) < min && i < fillers.length) {
    out = joinClean([out, fillers[i]]);
    i += 1;
  }

  // If script is too long, trim non-critical filler first.
  if (wordCount(out) > max) {
    const lines = out.split("\n");
    const keep = [];
    for (const line of lines) {
      // keep header, hook, brand, CTA, must-say
      const L = line.toUpperCase();
      const critical =
        L.startsWith(":") ||
        L.startsWith("HOOK:") ||
        L.startsWith("CTA:") ||
        L.startsWith("MUST-SAY:") ||
        L.startsWith("DETAILS:") ||
        L.includes("[") || // placeholders are still useful
        L.trim() === "" ||
        L === (safeStr(line)); // no-op

      // keep most lines, but drop filler-type lines if we're long
      if (wordCount(out) <= max) break;

      // remove obvious filler lines first
      const isFiller =
        line.includes("switch-up") ||
        line.includes("walk in") ||
        line.includes("stop thinking") ||
        line.includes("Either way") ||
        line.includes("hits the spot");

      if (isFiller && wordCount(out) > max) {
        // skip
      } else {
        keep.push(line);
      }
    }

    // If we didn't reduce enough, hard cap by removing last lines that aren't MUST-SAY.
    let reduced = joinClean(keep.length ? keep : lines);
    while (wordCount(reduced) > max) {
      const rLines = reduced.split("\n");
      const idx = rLines
        .map((l, idx2) => ({ l, idx2 }))
        .reverse()
        .find(x => !x.l.toUpperCase().startsWith("MUST-SAY:"))?.idx2;

      if (idx === undefined) break;
      rLines.splice(idx, 1);
      reduced = joinClean(rLines);
    }
    out = reduced;
  }

  return out;
}

// -------------------- ROUTE HANDLERS --------------------
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const duration = pickDuration(body);
    const brief = buildBrief(body);

    // Build + enforce duration
    let script = buildScript(duration, brief);
    script = padToDuration(script, duration);

    // Radio read formatting (numbers, money, urls, phones)
    const formatted = radioReadFormat(script);

    return NextResponse.json({
      ok: true,
      output: formatted,
      // helpful debugging; harmless if ignored by UI
      meta: {
        duration,
        words: wordCount(formatted),
        targets: targetWords(duration),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "Dex Radio API error" },
      { status: 500 }
    );
  }
}
