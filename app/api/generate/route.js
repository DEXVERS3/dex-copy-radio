import { NextResponse } from "next/server";

export const runtime = "nodejs";

const VERSION = "[[DEX_ENGINE_ARC_V3_SPOKEN]]";

const TARGET_LINES = {
  15: { min: 5, max: 7 },
  30: { min: 8, max: 11 },
  60: { min: 12, max: 16 },
};

function s(v){
  return typeof v === "string" ? v.trim() : "";
}

function pick(arr){
  return arr[Math.floor(Math.random() * arr.length)];
}

function lines(text){
  return s(text)
    .split(/\n+/)
    .map(x => x.trim())
    .filter(Boolean);
}

function unique(arr){
  const seen = new Set();
  const out = [];

  for(const item of arr){
    const t = s(item);
    const key = t.toLowerCase();
    if(!t || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }

  return out;
}

function ensurePeriod(t){
  const x = s(t);
  if(!x) return "";
  return /[.!?]$/.test(x) ? x : `${x}.`;
}

function pickDuration(body){
  const d = body?.mode ?? body?.duration ?? body?.seconds;
  const n = Number(d);
  if(n === 15 || n === 30 || n === 60) return n;
  return 30;
}

function subject(input){
  return s(input.brand) || s(input.offer) || "the event";
}

function oxfordJoin(arr){
  const a = arr.map(s).filter(Boolean);

  if(a.length === 0) return "";
  if(a.length === 1) return a[0];
  if(a.length === 2) return `${a[0]} and ${a[1]}`;

  return `${a.slice(0,-1).join(", ")}, and ${a[a.length-1]}`;
}

/* NUMBER TO WORDS */

function ones(n){
  return ["zero","one","two","three","four","five","six","seven","eight","nine"][n];
}

function teens(n){
  return ["ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"][n-10];
}

function tens(n){
  return ["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"][n];
}

function numberToWords(num){

  const n = Number(num);

  if(n < 10) return ones(n);

  if(n < 20) return teens(n);

  if(n < 100){

    const t = Math.floor(n/10);
    const r = n % 10;

    return r ? `${tens(t)}-${ones(r)}` : tens(t);
  }

  if(n < 1000){

    const h = Math.floor(n/100);
    const r = n % 100;

    return r ? `${ones(h)} hundred ${numberToWords(r)}` : `${ones(h)} hundred`;
  }

  if(n < 1000000){

    const th = Math.floor(n/1000);
    const r = n % 1000;

    return r ? `${numberToWords(th)} thousand ${numberToWords(r)}` : `${numberToWords(th)} thousand`;
  }

  return String(num);
}

/* MONEY */

function speakMoney(text){

  return text.replace(/\$(\d+)(?:\.(\d{1,2}))?/g,(m,d,c)=>{

    const dollars = numberToWords(Number(d));

    if(!c) return `${dollars} dollars`;

    const cents = numberToWords(Number(c));

    return `${dollars} dollars and ${cents} cents`;

  });

}

/* SIMPLE NUMBER SPEECH */

function speakNumbers(text){

  return text.replace(/\b\d+\b/g,(n)=>numberToWords(Number(n)));

}

/* URL SPEECH */

function speakUrl(url){

  let t = url.toLowerCase();

  t = t.replace(/^https?:\/\//,"");
  t = t.replace(/^www\./,"");

  const parts = t.split(".");

  const domain = parts.shift();

  const tail = parts.join(" dot ");

  const letters = domain.split("").join(" ");

  return `${letters} dot ${tail}`;

}

function speakUrls(text){

  return text.replace(/\b[a-z0-9-]+\.[a-z]{2,}\b/gi,(u)=>speakUrl(u));

}

/* MASTER SPEAKABLE */

function speakable(line){

  let out = s(line);

  out = speakUrls(out);
  out = speakMoney(out);
  out = speakNumbers(out);

  if(out.toLowerCase() === "kids under 8 ride free")
    return "Kids under eight ride free";

  return out;
}

function details(input){

  return unique(lines(input.details)).map(speakable);

}

function opening(subject,input){

  const offer = s(input.offer) ? speakable(input.offer) : "";

  if(offer){

    return pick([
      `This is your invitation to ${subject}, and ${offer.toLowerCase()}`,
      `You can feel certain weekends coming before they get here. ${subject} is one of them, and ${offer.toLowerCase()}`,
      `${subject} is one of those weekends people make room for, and ${offer.toLowerCase()}`
    ]);

  }

  return pick([
    `This is your invitation to ${subject}`,
    `${subject} is one of those events people look forward to`,
    `You can feel certain weekends coming before they get here. ${subject} is one of them`
  ]);

}

function buildSupport(details){

  if(!details.length) return "";

  const attractions = details.slice(0,4);
  const special = details[4];

  const base = oxfordJoin(attractions);

  if(special)
    return `${base}, plus ${special.toLowerCase()}`;

  return base;

}

function act3(subject){

  const reactions = [
    "That sounds like a pretty good weekend",
    "That is the kind of weekend people look forward to",
    "That is not a bad way to spend a day",
    `That is why people make time for ${subject}`,
    `That is what makes ${subject} worth the trip`
  ];

  const bridges = [
    "You hear that and you can already picture the day",
    "Once you hear that the plan usually makes itself",
    "That is usually all the convincing a person needs"
  ];

  const r = pick(reactions);

  return pick([
    r,
    `${pick(bridges)}. ${r}`,
    `${r}. ${pick(bridges)}`
  ]);

}

function closing(subject,input){

  const cta = s(input.cta) ? speakable(input.cta) : "";

  if(cta) return cta;

  return `Visit ${subject}`;

}

function fillers(){

  return [
    "Bring the family",
    "Make plans now",
    "This is one of those weekends",
    "You do not want to miss this one",
    "That is how weekends like this earn a crowd"
  ];

}

function splitLine(line){

  const t = s(line);

  if(t.length < 70) return [t];

  const parts = t.split(/, plus |, and |—|\. /)
    .map(x=>s(x))
    .filter(Boolean);

  if(parts.length > 1) return parts;

  return [t];

}

function expand(base,duration){

  const target = TARGET_LINES[duration];

  const script = [...base];

  const extra = fillers();

  for(const line of extra){

    if(script.length >= target.min) break;

    if(!script.includes(line))
      script.splice(Math.max(script.length-1,1),0,line);

  }

  return script.slice(0,target.max);

}

function buildScript(input,duration){

  const sub = speakable(subject(input));

  const det = details(input);

  const act1 = opening(sub,input);

  const act2 = buildSupport(det);

  const act3line = act3(sub);

  const close = closing(sub,input);

  let script = [act1,act2,act3line,close].filter(Boolean);

  script = script.flatMap(splitLine);

  script = expand(script,duration);

  script = script.map(speakable).map(ensurePeriod);

  return script.join("\n");

}

export async function POST(req){

  try{

    const body = await req.json().catch(()=>({}));

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

    const script = buildScript(input,duration);

    return NextResponse.json({
      ok:true,
      output:script,
      meta:{
        duration,
        version:VERSION
      }
    });

  }catch{

    return NextResponse.json(
      {ok:false,error:"Server error"},
      {status:500}
    );

  }

}
