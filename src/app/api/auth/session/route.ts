// src/app/api/auth/session/route.ts
import { NextResponse } from 'next/server';
import { setAuthCookies, clearAuthCookies } from '@/lib/tokens';

export const runtime = 'nodejs';          // garante compat com cookies() síncrono/assíncrono
export const dynamic = 'force-dynamic';   // evita cache

function noStoreHeaders() {
  return { 'Cache-Control': 'no-store' };
}

export async function POST(req: Request) {
  try {
    const ct = req.headers.get('content-type') || '';
    let body: any = {};
    if (ct.includes('application/json')) {
      body = await req.json();
    } else {
      const txt = await req.text();
      body = txt ? JSON.parse(txt) : {};
    }

    const accessToken =
      typeof body?.accessToken === 'string' ? body.accessToken.trim() : '';
    const refreshToken =
      typeof body?.refreshToken === 'string'
        ? body.refreshToken.trim()
        : undefined;

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: 'accessToken ausente' },
        { status: 400, headers: noStoreHeaders() },
      );
    }

    await setAuthCookies(accessToken, refreshToken);
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500, headers: noStoreHeaders() },
    );
  }
}

export async function DELETE() {
  await clearAuthCookies();
  return NextResponse.json({ ok: true }, { headers: noStoreHeaders() });
}
