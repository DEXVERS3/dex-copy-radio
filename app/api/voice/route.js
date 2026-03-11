import { NextResponse } from "next/server";

export const runtime = "nodejs";

function s(v) {
  return typeof v === "string" ? v.trim() : "";
}

function stripDexHeader(text) {
  return s(text).replace(/^\[\[.*?\]\]\s*/m, "").trim();
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

const LETTER_WORDS = {
  a: "a",
  b: "b",
  c: "c",
  d: "d",
  e: "e",
  f: "f",
  g: "g",
  h: "h",
  i: "i",
  j: "j",
  k: "k",
  l: "l",
  m: "m",
  n: "n",
  o: "o",
  p: "p",
  q: "q",
  r: "r",
  s: "s",
  t: "t",
  u: "u",
  v: "v",
  w: "w",
  x: "x",
  y: "y",
  z: "z",
};

function numberToWords(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return String(n);

  if (num < 0) return `minus ${numberToWords(Math.abs(num))}`;
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

function numberToWordsRadio(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return String(n);

  if (num >= 1000 && num <= 1999) {
    const first = Math.floor(num / 100);
    const last = num % 100;
    if (last === 0) return `${numberToWords(first)} hundred`;
    return `${numberToWords(first)} ${numberToWords(last)}`;
  }

  if (num >= 2000 && num <= 9999) {
    return numberToWords(num);
  }

  return numberToWords(num);
}

function digitStringToWords(str) {
  return String(str)
    .split("")
    .map((ch) => {
      if (/\d/.test(ch)) return SMALL[Number(ch)];
      return ch;
    })
    .join(" ");
}

function spellLetters(text) {
  return String(text)
    .toLowerCase()
    .split("")
    .map((ch) => LETTER_WORDS[ch] || ch)
    .join(" ");
}

function normalizeLine(line) {
  return s(line)
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .trim();
}

function formatCurrency(text) {
  let out = text;

  out = out.replace(/\$([0-9]+)\.([0-9]{2})\b/g, (_, dollars, cents) => {
    const d = numberToWords(Number(dollars));
    const c = numberToWords(Number(cents));
    return `${d} dollars and ${c} cents`;
  });

  out = out.replace(/\$([0-9]+)\b/g, (_, dollars) => {
    const d = Number(dollars);
    if (d === 1) return "one dollar";
    return `${numberToWords(d)} dollars`;
  });

  return out;
}

function formatPercentages(text) {
  return text.replace(/\b([0-9]+)%\b/g, (_, num) => {
    return `${numberToWords(Number(num))} percent`;
  });
}

function formatTimes(text) {
  let out = text;

  out = out.replace(/\b([0-9]{1,2}):([0-9]{2})\s?(a\.?m\.?|p\.?m\.?)\b/gi, (_, h, m, ap) => {
    const hour = numberToWords(Number(h));
    const minuteNum = Number(m);
    const minute =
      minuteNum === 0
        ? "o'clock"
        : minuteNum < 10
        ? `oh ${numberToWords(minuteNum)}`
        : numberToWords(minuteNum);

    const suffix = /^a/i.test(ap) ? "a m" : "p m";
    return minute === "o'clock" ? `${hour} ${suffix}` : `${hour} ${minute} ${suffix}`;
  });

  out = out.replace(/\b([0-9]{1,2})\s?(a\.?m\.?|p\.?m\.?)\b/gi, (_, h, ap) => {
    const hour = numberToWords(Number(h));
    const suffix = /^a/i.test(ap) ? "a m" : "p m";
    return `${hour} ${suffix}`;
  });

  return out;
}

function formatPhoneNumbers(text) {
  return text.replace(/\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g, (_, a, b, c) => {
    const parts = [a, b, c].map(digitStringToWords);
    return `${parts[0]}, ${parts[1]}, ${parts[2]}`;
  });
}

function formatSimpleAddressNumber(text) {
  return text.replace(
    /\b([0-9]{1,5})\s+([A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,3})\s(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct)\b/gi,
    (_, num, streetName, streetType) => {
      const spokenNum = numberToWordsRadio(Number(num));
      return `${spokenNum} ${streetName} ${streetType}`;
    }
  );
}

function formatFractionsAndDeals(text) {
  let out = text;

  out = out.replace(/\b([0-9]+)-for-([0-9]+)\b/gi, (_, a, b) => {
    return `${numberToWords(Number(a))} for ${numberToWords(Number(b))}`;
  });

  out = out.replace(/\b([0-9]+)\/([0-9]+)\b/g, (_, a, b) => {
    return `${numberToWords(Number(a))} over ${numberToWords(Number(b))}`;
  });

  return out;
}

function formatWebsiteDomain(domain) {
  const lower = domain.toLowerCase();
  const parts = lower.split(".");
  return parts
    .map((part, index) => {
      if (index === 0) {
        if (/^[a-z]+$/.test(part) && part.length <= 6) return spellLetters(part);
        return part
          .split(/[-_]/)
          .map((chunk) => (/^[a-z]+$/.test(chunk) && chunk.length <= 4 ? spellLetters(chunk) : chunk))
          .join(" dash ");
      }

      if (/^[a-z]+$/.test(part)) return `dot ${spellLetters(part)}`;
      return `dot ${part}`;
    })
    .join(" ");
}

function formatWebsites(text) {
  return text.replace(/\b((?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+)\b/g, (_, domain) => {
    return formatWebsiteDomain(domain.replace(/^https?:\/\//i, "").replace(/^www\./i, ""));
  });
}

function formatStandaloneNumbers(text) {
  return text.replace(/\b([0-9]{1,4})\b/g, (match, num, offset, full) => {
    const before = full[offset - 1] || "";
    if (before === "$") return match;
    return numberToWordsRadio(Number(num));
  });
}

function formatBroadcastRead(text) {
  let out = text;

  out = formatWebsites(out);
  out = formatPhoneNumbers(out);
  out = formatCurrency(out);
  out = formatPercentages(out);
  out = formatTimes(out);
  out = formatFractionsAndDeals(out);
  out = formatSimpleAddressNumber(out);
  out = formatStandaloneNumbers(out);

  out = out.replace(/&/g, " and ");
  out = out.replace(/@/g, " at ");
  out = out.replace(/\s*;\s*/g, ". ");
  out = out.replace(/\s+-\s+/g, " — ");
  out = out.replace(/\s{2,}/g, " ").trim();

  return out;
}

function addPerformanceShape(script) {
  const rawLines = stripDexHeader(script)
    .split("\n")
    .map(normalizeLine)
    .filter(Boolean);

  const lines = rawLines.map((line, index) => {
    let out = line;

    out = formatBroadcastRead(out);

    if (/^[A-Z0-9'&$%!.,;:\-\s]+$/.test(line)) {
      out = formatBroadcastRead(
        line.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase())
      );
    }

    if (
      /^(visit|stop by|get to|head to|go to|call|book|watch|join|fly|go birds|don’t miss|don't miss|never miss|log on|check out)/i.test(out)
    ) {
      out = `Pause. ${out}`;
    }

    if (index === rawLines.length - 1) {
      out = `Pause. ${out}`;
    }

    if (!/[.!?]$/.test(out)) out += ".";
    return out;
  });

  return lines.join(" ");
}

function getVoiceProfile(preset) {
  switch (preset) {
    case "executive":
      return {
        voice: "cedar",
        instructions:
          "Perform this like a polished radio announcer, not a literal reader. Use broadcast cadence. Let the hook land. Separate the offer cleanly. Add slight energy lifts on promo lines. Pause before the call to action. Never sound robotic or like you are reading a list.",
      };

    case "veteran":
      return {
        voice: "marin",
        instructions:
          "Perform this like a seasoned radio pro. Calm authority. Natural pacing. Mild gravitas. Let short lines breathe. Treat each sentence like copy, not text on a page. Strong pause before the final call to action.",
      };

    case "urban":
      return {
        voice: "onyx",
        instructions:
          "Perform this with modern radio energy and command. Tight rhythm. Let promo lines hit. Do not read literally. Shape it like a produced station spot. Strong hook, clear offer, clean punchy close.",
      };

    case "female_modern":
      return {
        voice: "nova",
        instructions:
          "Perform this like a modern female commercial voice. Polished, confident, bright, natural. Add subtle attitude where helpful. Let the offer breathe. Treat this as radio copy, not narration.",
      };

    case "female_warm":
      return {
        voice: "sage",
        instructions:
          "Perform this with warmth, confidence, and commercial polish. Smooth and human. Use natural announcer pacing. Shape the read with pauses and emphasis so it sounds like a produced radio promo, not literal narration.",
      };

    default:
      return {
        voice: "cedar",
        instructions:
          "Perform this like a professional radio announcer. Broadcast pacing. Natural emphasis. Pause before the CTA. Never read literally.",
      };
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const script = s(body.script || body.text);
    const preset = s(body.voicePreset || body.voice || "executive");

    if (!script) {
      return NextResponse.json({ ok: false, error: "No script provided." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "OPENAI_API_KEY is missing." }, { status: 500 });
    }

    const shaped = addPerformanceShape(script);
    const profile = getVoiceProfile(preset);

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: profile.voice,
        input: shaped,
        instructions: profile.instructions,
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: text || `Voice generation failed (${response.status})` },
        { status: 500 }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Voice route failed." },
      { status: 500 }
    );
  }
}
