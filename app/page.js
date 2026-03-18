'use client';

import { useMemo, useRef, useState } from 'react';
import VoiceControls from './components/VoiceControls';

const MODES = {
  '15': { label: ':15', hint: 'Tight. One hook + one benefit + CTA.' },
  '30': { label: ':30', hint: 'Add support + clean close.' },
  '60': { label: ':60', hint: 'More detail + stronger story.' },
};

const VOICE_PRESETS = [
  { value: 'executive', label: 'Executive Baritone' },
  { value: 'veteran', label: 'Veteran Authority' },
  { value: 'urban', label: 'Urban Command' },
  { value: 'female_modern', label: 'Modern Female Pro' },
  { value: 'female_warm', label: 'Warm Female Pro' },
];

export default function Home() {
  const [mode, setMode] = useState('30');
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState('');
  const [version, setVersion] = useState('');

  const [brand, setBrand] = useState('');
  const [offer, setOffer] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('confident, human, not salesy');
  const [cta, setCta] = useState('');
  const [mustSay, setMustSay] = useState('');
  const [tag, setTag] = useState('');
  const [details, setDetails] = useState('');

  const [voicePreset, setVoicePreset] = useState('executive');
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceError, setVoiceError] = useState('');

  const audioRef = useRef(null);

  const modeHint = useMemo(() => MODES[mode]?.hint ?? '', [mode]);

  function cleanScriptForVoice(text) {
    return String(text || '').replace(/^\[\[.*?\]\]\s*/m, '').trim();
  }

  async function generate(nextMode) {
    const useMode = typeof nextMode === 'string' ? nextMode : mode;

    setBusy(true);
    setOut('');
    setVersion('');
    setVoiceError('');

    try {
      const equationText = [
        brand && `BRAND: ${brand}`,
        offer && `OFFER: ${offer}`,
        cta && `CTA: ${cta}`,
        mustSay && `MUST-SAY: ${mustSay}`,
        tag && `TAG: ${tag}`,
        details && `DETAILS: ${details}`,
      ]
        .filter(Boolean)
        .join('\n');

      const payload = {
        mode: useMode,
        text: equationText,
        brand,
        offer,
        audience,
        tone,
        cta,
        mustSay,
        tag,
        details,
        brief: { brand, offer, audience, tone, cta, mustSay, tag, details },
      };

      const r = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });

      const j = await r.json().catch(() => ({}));

      setVersion(j?.meta?.version ? String(j.meta.version) : '');

      if (!r.ok || j?.ok === false) {
        setOut(j?.error ? `Error: ${j.error}` : `Error: ${r.status}`);
        return;
      }

      setOut(j.output ?? j.result ?? 'Output could not be parsed.');
    } catch (e) {
      setOut(`Error: ${String(e?.message || e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function playVoice() {
    const script = cleanScriptForVoice(out);
    if (!script || script.startsWith('Error:')) return;

    setVoiceBusy(true);
    setVoiceError('');

    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const r = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, voicePreset }),
      });

      if (!r.ok) {
        let message = `Voice error: ${r.status}`;
        try {
          const j = await r.json();
          if (j?.error) message = `Voice error: ${j.error}`;
        } catch {}
        setVoiceError(message);
        return;
      }

      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audioRef.current = audio;

      audio.onended = () => URL.revokeObjectURL(url);

      await audio.play();
    } catch (e) {
      setVoiceError(`Voice error: ${String(e?.message || e)}`);
    } finally {
      setVoiceBusy(false);
    }
  }

  function stopVoice() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }

  function reset() {
    setBrand('');
    setOffer('');
    setAudience('');
    setTone('confident, human, not salesy');
    setCta('');
    setMustSay('');
    setTag('');
    setDetails('');
    setOut('');
    setVersion('');
    setVoiceError('');
    stopVoice();
  }

  const inputStyle = {
    width: '100%',
    background: '#0f0f0f',
    color: '#fff',
    border: '1px solid #2a2a2a',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    lineHeight: 1.4,
    outline: 'none',
  };

  const labelStyle = { fontSize: 12, color: '#b5b5b5', marginTop: 14 };

  return (
    <main style={{ minHeight: '100vh', background: '#0b0b0b', color: '#fff', padding: '42px 24px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <h1 style={{ fontSize: 42 }}>DEX RADIO</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <input placeholder="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} style={inputStyle} />
          <input placeholder="Offer" value={offer} onChange={(e) => setOffer(e.target.value)} style={inputStyle} />
          <input placeholder="Audience" value={audience} onChange={(e) => setAudience(e.target.value)} style={inputStyle} />
          <input placeholder="Tone" value={tone} onChange={(e) => setTone(e.target.value)} style={inputStyle} />
          <input placeholder="CTA" value={cta} onChange={(e) => setCta(e.target.value)} style={inputStyle} />
          <input placeholder="Must-Say" value={mustSay} onChange={(e) => setMustSay(e.target.value)} style={inputStyle} />
          <input placeholder="Tag / Legal Disclaimer" value={tag} onChange={(e) => setTag(e.target.value)} style={inputStyle} />
        </div>

        <div style={labelStyle}>Details</div>
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={5} style={inputStyle} />

        <div style={{ marginTop: 20 }}>
          {Object.keys(MODES).map((k) => (
            <button key={k} onClick={() => { setMode(k); generate(k); }}>
              {MODES[k].label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 20, whiteSpace: 'pre-wrap' }}>
          {out || 'Output appears here'}
        </div>

        <button onClick={playVoice}>Play Voice</button>
        <button onClick={reset}>Reset</button>
      </div>
    </main>
  );
}
