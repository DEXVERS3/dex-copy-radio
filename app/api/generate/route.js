import { NextResponse } from "next/server";

export const runtime = "nodejs";

const VERSION = "[[DEX_ENGINE_ARC_V5_FIXED]]";

const TARGET_WORDS = {
  15: { min: 28, max: 42 },
  30: { min: 60, max: 85 },
  60: { min: 125, max: 155 },
};

function s(v) {
  return typeof v === "string" ? v.trim() : "";
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function lines(text) {
  return s(text)
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
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

function oxfordJoin(arr) {
  const a = arr.map(s).filter(Boolean);

  if (a.length === 0) return "";
  if (a.length === 1) return a[0];
  if (a.length === 2) return `${a[0]} and ${a[1]}`;

  return `${a.slice(0, -1).join(", ")}, and ${a[a.length - 1]}`;
}

function numberToWords(n) {
  const ones = [
    "zero","one","two","three","four","five",
    "six","seven","eight","nine"
  ];

  const teens = [
    "ten","eleven","twelve","thirteen","fourteen",
    "fifteen","sixteen","seventeen","eighteen","nineteen"
  ];

  const tens = [
    "","","twenty","thirty","forty",
    "fifty","sixty","seventy","eighty","ninety"
  ];

  n = Number(n);

  if (n < 10) return ones[n];
  if (n < 20) return teens[n-10];

  if (n < 100) {
    const t = Math.floor(n/10);
    const r = n%10;
    return r ? `${tens[t]}-${ones[r]}` : tens[t];
  }

  if (n < 1000) {
    const h = Math.floor(n/100);
    const r = n%100;
    return r
      ? `${ones[h]} hundred ${numberToWords(r)}`
      : `${ones[h]} hundred`;
  }

  if (n < 1000000) {
    const th = Math.floor(n/1000);
    const r = n%1000;
    return r
      ? `${numberToWords(th)} thousand ${numberToWords(r)}`
      : `${numberToWords(th)} thousand`;
  }

  return String(n);
}

function speakNumbers(text) {
  return text.replace(/\b\d+\b/g,(n)=>numberToWords(n));
}

function speakMoney(text) {
  return text.replace(/\$(\d+)(?:\.(\d{1,2}))?/g,(m,d,c)=>{

    const dollars = numberToWords(Number(d));

    if(!c) return `${dollars} dollars`;

    const cents = numberToWords(Number(c));

    return `${dollars} dollars and ${cents} cents`;

  });
}

function speakable(line) {
  let out = s(line);

  if (out.toLowerCase() === "kids under 8 ride free") {
    return "Kids under eight ride free";
  }

  out = speakMoney(out);
  out = speakNumbers(out);

  return out;
}

function details(input) {
  return unique
