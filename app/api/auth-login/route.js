import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const password = String(body?.password || '').trim();
    const realPassword = String(process.env.DEX_APP_PASSWORD || '').trim();

    if (!realPassword) {
      return NextResponse.json(
        { ok: false, error: 'DEX_APP_PASSWORD is missing.' },
        { status: 500 }
      );
    }

    if (password !== realPassword) {
      return NextResponse.json(
        { ok: false, error: 'Incorrect password.' },
        { status: 401 }
      );
    }

    const res = NextResponse.json({ ok: true });

    res.cookies.set('dex_gate', 'open', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12,
    });

    return res;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Login failed.' },
      { status: 500 }
    );
  }
}
