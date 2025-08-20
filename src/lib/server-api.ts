import { headers } from 'next/headers';
import { getTenantFromHeaders } from './tenant';
import { readAccessToken, readRefreshToken, setAuthCookies, clearAuthCookies } from './tokens';

const API_BASE = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '';

type FetchInit = RequestInit & { asJson?: boolean };

async function doFetch(path: string, init: FetchInit, at?: string, tenant?: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(tenant ? { 'x-tenant-subdomain': tenant } : {}),
      ...(at ? { Authorization: `Bearer ${at}` } : {}),
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });
  return res;
}

/** SSR/RSC/RouteHandler fetch com x-tenant + AT + auto-refresh (401). */
export async function serverApiFetch<T = any>(path: string, init: FetchInit = {}): Promise<T> {
  if (!API_BASE) throw new Error('API_BASE_URL não configurada.');

  const h = await headers();
  const tenant = getTenantFromHeaders(h);
  let at = await readAccessToken();

  // 1ª tentativa
  let res = await doFetch(path, init, at || undefined, tenant || undefined);
  if (res.status !== 401) {
    if (init.asJson === false) return res as unknown as T;
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text().catch(()=>'')}`);
    return (await res.json()) as T;
  }

  // 401 -> tentar refresh
  const rt = await readRefreshToken();
  if (!rt) {
    await clearAuthCookies();
    throw new Error('Unauthorized and no refresh token');
  }

  const refreshRes = await doFetch('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: rt }),
  }, undefined, tenant || undefined);

  if (!refreshRes.ok) {
    await clearAuthCookies();
    throw new Error(`Refresh failed (${refreshRes.status})`);
  }

  const tokens = await refreshRes.json().catch(() => null) as { accessToken?: string; refreshToken?: string };
  if (!tokens?.accessToken) {
    await clearAuthCookies();
    throw new Error('Refresh response without accessToken');
  }

  // Atualiza cookies e repete requisição original
  await setAuthCookies(tokens.accessToken, tokens.refreshToken);
  at = tokens.accessToken;

  res = await doFetch(path, init, at, tenant || undefined);
  if (init.asJson === false) return res as unknown as T;
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text().catch(()=>'')}`);
  return (await res.json()) as T;
}
