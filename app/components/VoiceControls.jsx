'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export default function VoiceControls({
  onTranscript,        // (text) => void  -> where dictation gets sent (e.g., to Details)
  onSpeakRequest,      // () => string     -> provide text to speak (e.g., output)
  enabledByDefault = true
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [ttsOn, setTtsOn] = useState(enabledByDefault);
  const recogRef = useRef(null);
  const finalRef = useRef('');

  const SpeechRecognition = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }, []);

  useEffect(() => {
    setSupported(Boolean(SpeechRecognition) && typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, [SpeechRecognition]);

  function startListening() {
    if (!SpeechRecognition) return;
    if (listening) return;

    finalRef.current = '';

    const r = new SpeechRecognition();
    r.continuous = true;        // push-to-talk, but continuous while held
    r.interimResults = true;
    r.lang = 'en-US';

    r.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0]?.transcript ?? '';
        if (event.results[i].isFinal) finalRef.current += (text + ' ');
        else interim += text;
      }
      // We only commit FINAL when user releases (stopListening)
    };

    r.onerror = () => {
      setListening(false);
    };

    r.onend = () => {
      setListening(false);
    };

    recogRef.current = r;
    setListening(true);
    r.start();
  }

  function stopListening() {
    const r = recogRef.current;
    if (!r) return;

    try { r.stop(); } catch {}
    recogRef.current = null;

    const committed = finalRef.current.trim();
    if (committed) onTranscript?.(committed);
  }

  function speak(text) {
    if (!ttsOn) return;
    if (typeof window === 'undefined') return;
    if (!text) return;

    // Hard stop any previous audio
    try { window.speechSynthesis.cancel(); } catch {}

    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0;
    u.pitch = 1.0;
    u.volume = 1.0;

    // Pick a “clean/pro” English voice if available
    const voices = window.speechSynthesis.getVoices?.() ?? [];
    const preferred = voices.find(v => /en-US/i.test(v.lang) && /Google|Microsoft|Samantha|Alex/i.test(v.name))
                   || voices.find(v => /en/i.test(v.lang))
                   || null;
    if (preferred) u.voice = preferred;

    window.speechSynthesis.speak(u);
  }

  function speakOutput() {
    const text = onSpeakRequest?.() ?? '';
    speak(text);
  }

  if (!supported) {
    return (
      <div style={{ marginTop: 12, padding: 12, border: '1px solid #2a2a2a', borderRadius: 10 }}>
        <div style={{ fontSize: 12, color: '#b5b5b5' }}>
          Voice controls require Chrome/Edge (Web Speech API). This browser doesn’t support it.
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12, padding: 12, border: '1px solid #2a2a2a', borderRadius: 10 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
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
            cursor: 'pointer'
          }}
        >
          {listening ? 'Listening… (release to stop)' : 'Push-to-talk'}
        </button>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#b5b5b5' }}>
          <input
            type="checkbox"
            checked={ttsOn}
            onChange={(e) => setTtsOn(e.target.checked)}
          />
          Speak output
        </label>

        <button
          onClick={speakOutput}
          style={{
            background: '#0f0f0f',
            color: '#fff',
            border: '1px solid #2a2a2a',
            borderRadius: 10,
            padding: '10px 12px',
            cursor: 'pointer'
          }}
        >
          Play last output
        </button>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: '#b5b5b5' }}>
        Push-to-talk appends dictated text into <b>Details</b>. Then hit Generate.
      </div>
    </div>
  );
}
