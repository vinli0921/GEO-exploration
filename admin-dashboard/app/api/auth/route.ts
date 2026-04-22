import { NextRequest, NextResponse } from 'next/server';
import { signSession, constantTimeEqual } from '@/lib/auth';
import { RateLimiter } from '@/lib/rate-limit';

const limiter = new RateLimiter({ max: 5, windowMs: 60_000 });

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.ip || 'unknown';
  if (!limiter.tryConsume(ip)) {
    return NextResponse.json({ error: 'too many attempts' }, { status: 429 });
  }

  const expected = process.env.DASHBOARD_PASSWORD;
  const secret = process.env.DASHBOARD_PASSWORD;
  if (!expected || !secret) {
    return NextResponse.json({ error: 'server misconfigured' }, { status: 500 });
  }

  let body: { password?: string; next?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  if (!body.password || !constantTimeEqual(body.password, expected)) {
    return NextResponse.json({ error: 'invalid password' }, { status: 401 });
  }

  const token = signSession(secret, { issuedAt: Date.now() });
  const next = (body.next && body.next.startsWith('/') ? body.next : '/');

  const res = NextResponse.json({ ok: true, next });
  res.cookies.set('dashboard_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
  return res;
}
