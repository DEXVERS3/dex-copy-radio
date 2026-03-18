'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const r = await fetch('/api/auth-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const j = await r.json().catch(() => ({}));

      if (!r.ok || j?.ok === false) {
        setError(j?.error || 'Login failed.');
        return;
      }

      window.location.href = '/';
    } catch {
      setError('Login failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0b0b0b',
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#0f0f0f',
          border: '1px solid #2a2a2a',
          borderRadius: 14,
          padding: 24,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 36 }}>DEX RADIO</h1>
        <div style={{ marginTop: 8, color: '#b5b5b5', fontSize: 14 }}>
          Control Room Access
        </div>

        <form onSubmit={handleLogin} style={{ marginTop: 22 }}>
          <div style={{ fontSize: 12, color: '#b5b5b5', marginBottom: 8 }}>
            Password
          </div>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              background: '#0b0b0b',
              color: '#fff',
              border: '1px solid #2a2a2a',
              borderRadius: 10,
              padding: 12,
              fontSize: 14,
              outline: 'none',
            }}
          />

          <button
            type="submit"
            disabled={busy || !password.trim()}
            style={{
              width: '100%',
              marginTop: 14,
              background: '#fff',
              color: '#000',
              border: '1px solid #fff',
              borderRadius: 10,
              padding: '12px 14px',
              fontSize: 14,
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? 'Entering…' : 'Enter Control Room'}
          </button>

          {error ? (
            <div style={{ marginTop: 12, color: '#ff8b8b', fontSize: 13 }}>
              {error}
            </div>
          ) : null}
        </form>
      </div>
    </main>
  );
}
