'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export default function VoiceControls({
  onTranscript,
  spokenText = '',
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);

  const recogRef = useRef(null);
  const finalRef = useRef('');

  const SpeechRecognition = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }, []);

  useEffect(() => {
    const ok =
      typeof window !== 'undefined' &&
      Boolean(SpeechRecognition) &&
      'speechSynthesis' in window &&
      typeof window.SpeechSynthesisUtterance !== 'undefined';

    setSupported(ok);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
          try {
            window.speechSynthesis.getVoices();
          } catch {}
        };
      } catch {}
    }
  }, [SpeechRecognition]);

  function startListening() {
    if (!SpeechRecognition) return;
    if (listening) return;

    finalRef.current = '';

    const r = new SpeechRecognition();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-US';

    r.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0]?.transcript ?? '';
        if (event.results[i].isFinal) {
          finalRef.current += `${text} `;
        }
      }
    };

    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);

    recogRef.current = r;
    setListening(true);
    r.start();
  }

  function stopListening() {
    const r = recogRef.current;
    if (!r) return;

    try {
      r.stop();
    } catch {}

    recogRef.current = null;

    const committed = finalRef.current.trim();
    if (committed) onTranscript?.(committed);
  }

  function speak(text) {
    if (typeof window === 'undefined') return;
    if (!text || !text.trim()) return;

    try {
      window.speechSynthesis.cancel();
    } catch {}

    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    try {
      const voices = window.speechSynthesis.getVoices?.() ?? [];
      const preferred =
        voices.find((v) => /en-US/i.test(v.lang) && /Google|Microsoft|Samantha|Alex/i.test(v.name)) ||
        voices.find((v) => /en-US/i.test(v.lang)) ||
        voices.find((v) => /en/i.test(v.lang)) ||
        null;

      if (preferred) utterance.voice = preferred;
    } catch {}

    window.speechSynthesis.speak(utterance);
  }

  if (!supported) {
    return (
      <div style={{ marginTop: 12, padding: 12, border: '1px solid #2a2a2a', borderRadius: 10 }}>
        <div style={{ fontSize: 12, color: '#b5b5b5' }}>
          Voice controls require Chrome or Edge.
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12, padding: 12, border: '1px solid #2a2a2a', borderRadius: 10 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onMouseDown={startListening}
          onMouseUp={stopListening}
          onMouseLeave={stopListening}
          onTouchStart={startListening}
          onTouchEnd={stopListening}
          style={{
            background: listening ? '#222' : '#0f0f0f',
            color: '#fff',
            border: '1px solid #2a2a2a',
            borderRadius: 10,
            padding: '10px 12px',
            cursor: 'pointer',
          }}
        >
          {listening ? 'Listening… (release to stop)' : 'Push-to-talk'}
        </button>

        <button
          type="button"
          onClick={() => speak(spokenText)}
          style={{
            background: '#0f0f0f',
            color: '#fff',
            border: '1px solid #2a2a2a',
            borderRadius: 10,
            padding: '10px 12px',
            cursor: 'pointer',
          }}
        >
          Play last output
        </button>

        <button
          type="button"
          onClick={() => speak('DEX voice test')}
          style={{
            background: '#0f0f0f',
            color: '#fff',
            border: '1px solid #2a2a2a',
            borderRadius: 10,
            padding: '10px 12px',
            cursor: 'pointer',
          }}
        >
          Test voice
        </button>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: '#b5b5b5' }}>
        Push-to-talk adds text to Details. Generate with :15 / :30 / :60. Then click Play last output.
      </div>
    </div>
  );
}
