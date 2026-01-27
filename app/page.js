'use client';

import { useMemo, useState } from 'react';

const MODES = {
  '15': { label: ':15', hint: 'Tight. One hook + one benefit + CTA + must-say.' },
  '30': { label: ':30', hint: 'Add one proof point or quick story beat.' },
  '60': { label: ':60', hint: 'Two beats + clearer benefit + clean close.' },
};

export default function Home() {
  const [mode, setMode] = useState('30');
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState('');
  const [version, setVersion] = useState('');

  // Intake fields
  const [brand, setBrand] = useState('');
  const [offer, setOffer] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('confident, human, not salesy');
  const [cta, setCta] = useState('');
  const [mustSay, setMustSay] = useState('');
  const [details, setDetails] = useState('');

  const modeHint = useMemo(() => MODES[mode]?.hint ?? '', [mode]);

  async function generate(nextMode) {
    const useMode = typeof nextMode === 'string' ? nextMode : mode;

    setBusy(true);
    setOut('');
    setVersion('');
    try {
      // EQUATION TEXT: 1 + 2 + 5 + 6 + 7
      const equationText = [
        brand && `BRAND: ${brand}`,
        offer && `OFFER: ${offer}`,
        cta && `CTA: ${cta}`,
        mustSay && `MUST-SAY: ${mustSay}`,
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
        details,
        brief: { brand, offer, audience, tone, cta, mustSay, details },
      };

      const r = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });

      const j = await r.json().catch(() => ({}));

      // show backend version so we KNOW what code is live
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

  function reset() {
    setBrand('');
    setOffer('');
    setAudience('');
    setTone('confident, human, not salesy');
    setCta('');
    setMustSay('');
    setDetails('');
    setOut('');
    setVersion('');
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
    <main
      style={{
        minHeight: '100vh',
        background: '#0b0b0b',
        color: '#ffffff',
        padding: '42px 24px',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto', position: 'relative' }}>
        <button
          type="button"
          title="Coming soon"
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            background: 'transparent',
            color: '#b5b5b5',
            border: '1px solid #2a2a2a',
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 13,
            cursor: 'pointer',
          }}
          onClick={() => alert('Control Room is coming next.')}
        >
          Control Room
        </button>

        <h1 style={{ fontSize: 46, margin: 0, letterSpacing: 0.5 }}>DEX RADIO</h1>
        <div style={{ marginTop: 6, color: '#b5b5b5', fontSize: 16 }}>
          <span style={{ fontWeight: 600, color: '#eaeaea' }}>Radio copy.</span> On demand.
        </div>

        <div style={{ marginTop: 22, fontSize: 12, color: '#b5b5b5' }}>Intake</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 12, color: '#b5b5b5' }}>Brand</div>
            <input value={brand} onChange={(e) => setBrand(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#b5b5b5' }}>Offer</div>
            <input value={offer} onChange={(e) => setOffer(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#b5b5b5' }}>Audience</div>
            <input value={audience} onChange={(e) => setAudience(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#b5b5b5' }}>Tone</div>
            <input value={tone} onChange={(e) => setTone(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#b5b5b5' }}>CTA</div>
            <input value={cta} onChange={(e) => setCta(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#b5b5b5' }}>Must-say (legal / required)</div>
            <input value={mustSay} onChange={(e) => setMustSay(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={labelStyle}>Details (optional)</div>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={6}
          placeholder="Any specifics: price, dates, location, qualifiers, phone, URL, station line, etc."
          style={{ ...inputStyle, marginTop: 8 }}
        />

        <div style={{ marginTop: 14, fontSize: 12, color: '#b5b5b5' }}>Spot length</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {Object.entries(MODES).map(([k, v]) => {
            const active = mode === k;
            return (
              <button
                key={k}
                type="button"
                disabled={busy}
                onClick={() => {
                  setMode(k);
                  generate(k);
                }}
                style={{
                  background: active ? '#ffffff' : 'transparent',
                  color: active ? '#000' : '#fff',
                  border: active ? '1px solid #fff' : '1px solid #2a2a2a',
                  padding: '10px 14px',
                  borderRadius: 999,
                  fontSize: 14,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  opacity: busy ? 0.6 : 1,
                }}
                title={busy ? 'Generating…' : `Generate a ${v.label} script`}
              >
                {busy && active ? 'Generating…' : v.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={reset}
            disabled={busy}
            style={{
              background: 'transparent',
              color: '#fff',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #2a2a2a',
              fontSize: 14,
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            Reset
          </button>

          <div style={{ fontSize: 12, color: '#7a7a7a', marginLeft: 4 }}>
            {modeHint}
          </div>
        </div>

        <div style={{ marginTop: 22, fontSize: 12, color: '#b5b5b5' }}>Output</div>
        <div
          style={{
            marginTop: 8,
            background: '#0f0f0f',
            border: '1px solid #2a2a2a',
            borderRadius: 10,
            padding: 14,
            minHeight: 160,
            fontSize: 14,
            lineHeight: 1.55,
            whiteSpace: 'pre-wrap',
            color: out ? '#fff' : '#7a7a7a',
          }}
        >
          {out || 'Output will appear here'}
        </div>

        <div style={{ marginTop: 8, fontSize: 12, color: '#7a7a7a' }}>
          {version ? `API version: ${version}` : ''}
        </div>
      </div>
    </main>
  );
}
