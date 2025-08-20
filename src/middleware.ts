// src/middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const PUBLIC_APP_DOMAIN = (process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'harpersystem.com.br').toLowerCase();

// Rotas públicas de página (não inclui /api — /api é excluído pelo matcher)
const PUBLIC_PATHS = ['/login', '/logout'];

/* ----------------- utils ----------------- */
function stripPort(host: string) {
  return host.split(':')[0];
}

function getTenantFromHost(hostname: string): string | null {
  const base = stripPort((hostname || '').toLowerCase());
  if (!base) return null;

  // DEV: acme.localhost
  if (base.endsWith('.localhost')) {
    const [sub] = base.split('.');
    return sub || null;
  }

  // PROD: acme.<PUBLIC_APP_DOMAIN>
  if (base.endsWith(`.${PUBLIC_APP_DOMAIN}`)) {
    const [sub] = base.split('.');
    return sub || null;
  }

  return null;
}

function resolveTenant(req: NextRequest): string | null {
  const qp = req.nextUrl.searchParams.get('tenant') || req.nextUrl.searchParams.get('t');
  if (qp?.trim()) return qp.trim().toLowerCase();

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const fromHost = getTenantFromHost(host);
  if (fromHost) return fromHost;

  const envSlug = process.env.NEXT_PUBLIC_TENANT_SLUG?.trim()?.toLowerCase();
  return envSlug || null;
}

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

/* --------------- middleware --------------- */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Deriva tenant cedo (usa em redirects e headers de conveniência)
  const tenant = resolveTenant(req);

  // Checagem de autenticação apenas para páginas (não /api, ver matcher)
  const isPublic = isPublicPath(pathname);
  const hasAT = Boolean(req.cookies.get('hs_at')?.value);

  // Bloqueia rotas privadas sem cookie de acesso
  if (!isPublic && !hasAT) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    if (tenant) url.searchParams.set('tenant', tenant);
    url.searchParams.set('next', pathname + (search || ''));
    return NextResponse.redirect(url);
  }

  // Já autenticado e acessando /login → manda para destino (next) ou /clients
  if (isPublic && hasAT && pathname === '/login') {
    const nextParam = req.nextUrl.searchParams.get('next');
    const dest = nextParam && nextParam.startsWith('/') ? nextParam : '/clients';
    const [destPath, destQs] = dest.split('?');
    const url = req.nextUrl.clone();
    url.pathname = destPath || '/clients';
    url.search = destQs ? `?${destQs}` : '';
    return NextResponse.redirect(url);
  }

  // (Opcional) propagar headers de conveniência para páginas server-side
  const requestHeaders = new Headers(req.headers);
  if (tenant) {
    requestHeaders.set('x-tenant-subdomain', tenant);
    requestHeaders.set('x-tenant-slug', tenant);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

/**
 * Importante:
 * - Exclui /api da execução (para não bloquear o route handler /api/auth/session).
 * - Exclui _next e quaisquer arquivos estáticos (.*).
 */
export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
