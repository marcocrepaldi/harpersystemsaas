import { cookies } from 'next/headers';

const SECURE = process.env.NODE_ENV === 'production';
const DOMAIN: string | undefined = process.env.AUTH_COOKIES_DOMAIN || undefined; // ex.: ".harpersystem.com.br"

export const COOKIE_AT = 'hs_at'; // Access Token
export const COOKIE_RT = 'hs_rt'; // Refresh Token

/** Lê o Access Token (cookie httpOnly) no contexto server. */
export async function readAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_AT)?.value ?? null;
}

/** Lê o Refresh Token (cookie httpOnly) no contexto server. */
export async function readRefreshToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_RT)?.value ?? null;
}

/**
 * Define os cookies httpOnly de autenticação.
 * - AT: 15 minutos
 * - RT: 7 dias (opcional)
 * Use apenas em Server Actions / Route Handlers.
 */
export async function setAuthCookies(accessToken: string, refreshToken?: string): Promise<void> {
  const store = await cookies();

  store.set(COOKIE_AT, accessToken, {
    httpOnly: true,
    secure: SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 15, // 15m
    domain: DOMAIN,
  });

  if (refreshToken) {
    store.set(COOKIE_RT, refreshToken, {
      httpOnly: true,
      secure: SECURE,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7d
      domain: DOMAIN,
    });
  }
}

/** Remove os cookies httpOnly de autenticação. */
export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();

  store.set(COOKIE_AT, '', {
    httpOnly: true,
    secure: SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    domain: DOMAIN,
  });

  store.set(COOKIE_RT, '', {
    httpOnly: true,
    secure: SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    domain: DOMAIN,
  });
}
