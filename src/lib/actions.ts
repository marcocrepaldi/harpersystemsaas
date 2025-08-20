// src/app/login/actions.ts
'use server';

import { headers } from 'next/headers';
import { getTenantFromHeaders } from '@/lib/tenant';
import { setAuthCookies, clearAuthCookies, readAccessToken } from '@/lib/tokens';

const API_BASE = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '';

export async function loginAction(email: string, password: string) {
  if (!API_BASE) throw new Error('API_BASE_URL não configurada.');

  const h = await headers();
  const tenant = getTenantFromHeaders(h);

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(tenant ? { 'x-tenant-subdomain': tenant } : {}),
    },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Login failed (${res.status}): ${text}`);
  }

  let json: any;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error('Resposta inválida do servidor de autenticação.');
  }

  const at = json.accessToken ?? json.access_token;
  const rt = json.refreshToken ?? json.refresh_token;
  if (!at) throw new Error('Token ausente no login');

  await setAuthCookies(at, rt);
  return { ok: true };
}

export async function logoutAction() {
  try {
    const at = await readAccessToken();
    if (API_BASE && at) {
      const h = await headers();
      const tenant = getTenantFromHeaders(h);

      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          ...(tenant ? { 'x-tenant-subdomain': tenant } : {}),
          Authorization: `Bearer ${at}`,
        },
        cache: 'no-store',
      }).catch(() => null);
    }
  } finally {
    await clearAuthCookies();
  }
  return { ok: true };
}
