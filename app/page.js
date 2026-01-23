'use client';

import { useMemo, useState } from 'react';

const MODES = {
  "15": {
    label: ":15",
    hint: "Brand + offer + audience + tone + CTA + must-say (if any).",
  },
  "30": {
    label: ":30",
    hint: "Same as :15, plus one quick story beat or proof point.",
  },
  "60": {
    label: ":60",
    hint: "Same as :30, plus a second beat + clearer benefit + cleaner close.",
  },
};


export default function Home() {
  const [mode, setMode] = useState("30");
  const [text, setText] = useState('');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);

  const placeholder = useMemo(() => MODES[mode]?.hint ?? 'What do you want to say?', [mode]);

  async function generate() {
    setBusy(true);
    setOut('');
    try {
      const r = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, mode }),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setOut(j?.error ? `Error: ${j.error}` : `Error: ${r.status}`);
        return;
      }
      setOut(j.output ?? 'Output could not be parsed.');
    } catch (e) {
      setOut(`Error: ${String(e?.message || e)}`);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setText('');
    setOut('');
  }

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
          <span style={{ fontWeight: 600, color: '#eaeaea' }}>Radio Copy.</span> On Demand.
        </div>

       

        <div style={{ marginTop: 18, fontSize: 12, color: '#b5b5b5' }}>Input</div>
        <textarea
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={9}
          style={{
            marginTop: 8,
            width: '100%',
            background: '#0f0f0f',
            color: '#fff',
            border: '1px solid #2a2a2a',
            borderRadius: 10,
            padding: 14,
            fontSize: 14,
            lineHeight: 1.5,
            outline: 'none',
          }}
        />

      <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center', flexWrap: 'nowrap' }}>

          <button
            type="button"
            onClick={generate}
            disabled={busy || !text.trim()}
            style={{
              background: busy || !text.trim() ? '#666' : '#ffffff',
              color: '#000',
              padding: '10px 14px',
              borderRadius: 10,
              border: 'none',
              fontSize: 14,
              cursor: busy || !text.trim() ? 'not-allowed' : 'pointer',
            }}
          >
<div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
  <div style={{ display: 'flex', gap: 10 }}>
  {Object.entries(MODES).map(([k, v]) => {
    const active = mode === k;
    return (
      <button
        key={k}
        type="button"
        onClick={() => setMode(k)}
        style={{
          background: active ? '#ffffff' : 'transparent',
          color: active ? '#000' : '#fff',
          border: active ? '1px solid #fff' : '1px solid #2a2a2a',
          padding: '8px 12px',
          borderRadius: 999,
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        {v.label}
      </button>
    );
  })}
</div>


  <button
    type="button"
    onClick={generate}
    disabled={busy}
  >
    Generate
  </button>
</div>

            {busy ? 'Generating…' : 'Generate Copy'}
          </button>

          <button
            type="button"
            onClick={reset}
            style={{
              background: 'transparent',
              color: '#fff',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #2a2a2a',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>

        <div style={{ marginTop: 22, fontSize: 12, color: '#b5b5b5' }}>Output</div>
        <div
          style={{
            marginTop: 8,
            background: '#0f0f0f',
            border: '1px solid #2a2a2a',
            borderRadius: 10,
            padding: 14,
            minHeight: 140,
            fontSize: 14,
            lineHeight: 1.55,
            whiteSpace: 'pre-wrap',
            color: out ? '#fff' : '#7a7a7a',
          }}
        >
          {out || 'Output will appear here'}
        </div>

        <div
          style={{
            marginTop: 18,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#7a7a7a',
            fontSize: 12,
          }}
        >
          <span>Jim core online</span>
          <span />
        </div>
      </div>
    </main>
  );
}
