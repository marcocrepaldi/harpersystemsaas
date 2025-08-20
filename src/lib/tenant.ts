// src/lib/tenant.ts

// Não marcamos "use client" para permitir import em módulos server.
// Cada função faz seus próprios guards para window/localStorage/headers.

const STORAGE_KEY = 'tenantSlug';

// Opcional: defina em .env.local para produção se quiser customizar o domínio pai
// ex.: NEXT_PUBLIC_APP_DOMAIN=harpersystem.com.br
const PUBLIC_APP_DOMAIN =
  (process?.env?.NEXT_PUBLIC_APP_DOMAIN as string | undefined)?.toLowerCase() || 'harpersystem.com.br';

/* ----------------------------------------
 * Helpers de ambiente
 * --------------------------------------*/
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function stripPort(host: string): string {
  return host.split(':')[0];
}

/* ----------------------------------------
 * Derivação por HOST (subdomínio) — client & server
 * --------------------------------------*/
export function getTenantFromHost(hostname: string): string | null {
  const hostRaw = String(hostname || '').toLowerCase();
  if (!hostRaw) return null;
  const host = stripPort(hostRaw);

  // DEV: harper.localhost
  if (host.endsWith('.localhost')) {
    const [sub] = host.split('.');
    return sub || null;
  }

  // PROD: harper.<PUBLIC_APP_DOMAIN> (padrão: harpersystem.com.br)
  if (host.endsWith(`.${PUBLIC_APP_DOMAIN}`)) {
    const [sub] = host.split('.');
    return sub || null;
  }

  return null;
}

/* ----------------------------------------
 * Query param (?tenant=) — apenas client
 * --------------------------------------*/
export function detectTenantSlugFromQuery(): string | null {
  try {
    if (!isBrowser()) return null;
    const qs = new URL(window.location.href).searchParams.get('tenant');
    if (qs && qs.trim()) return qs.trim().toLowerCase();
  } catch {
    // ignore
  }
  return null;
}

/* ----------------------------------------
 * LocalStorage — apenas client
 * --------------------------------------*/
export function saveTenantSlug(slug: string) {
  try {
    if (!isBrowser()) return;
    if (!slug) return;
    window.localStorage.setItem(STORAGE_KEY, slug.toLowerCase());
  } catch {
    // ignore
  }
}

export function getStoredTenantSlug(): string | null {
  try {
    if (!isBrowser()) return null;
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/* ----------------------------------------
 * Fallback via env pública — client & server
 * --------------------------------------*/
function getEnvTenantSlug(): string | null {
  try {
    const raw = process?.env?.NEXT_PUBLIC_TENANT_SLUG as string | undefined;
    if (raw && raw.trim()) return raw.trim().toLowerCase();
  } catch {
    // ignore
  }
  return null;
}

/* ----------------------------------------
 * APIs de TENANT — Client
 * --------------------------------------*/
export function getTenantSlug(): string | null {
  // 1) Pelo host (subdomínio) — preferencial em prod/dev
  if (isBrowser()) {
    const fromHost = getTenantFromHost(window.location.hostname);
    if (fromHost) {
      // opcional: persistir para reuso
      saveTenantSlug(fromHost);
      return fromHost;
    }
  }

  // 2) Override via query (?tenant=) — útil em QA/dev
  const fromUrl = detectTenantSlugFromQuery();
  if (fromUrl) {
    saveTenantSlug(fromUrl);
    return fromUrl;
  }

  // 3) LocalStorage (último tenant usado no client)
  const fromStorage = getStoredTenantSlug();
  if (fromStorage) return fromStorage;

  // 4) Fallback via env pública
  return getEnvTenantSlug();
}

/* ----------------------------------------
 * APIs de TENANT — Server (RSC/Route Handlers)
 * --------------------------------------*/
export function getTenantFromHeaders(
  h: Headers | { get: (k: string) => string | null },
): string | null {
  try {
    const host =
      (h.get('x-forwarded-host') || h.get('host') || '').toString().toLowerCase();
    return getTenantFromHost(host);
  } catch {
    return null;
  }
}

/* ----------------------------------------
 * Headers para backend
 * --------------------------------------*/
export function getTenantHeaders(): Record<string, string> {
  // Client: usa getTenantSlug()
  const slug = getTenantSlug();
  return slug
    ? {
        // Header esperado pelo backend (AuthController aceita x-tenant-subdomain)
        'x-tenant-subdomain': slug,
        // Compat extra, caso em algum ponto você queira ler "slug" diretamente
        'x-tenant-slug': slug,
      }
    : {};
}

export function getTenantServerHeaders(
  h: Headers | { get: (k: string) => string | null },
): Record<string, string> {
  // Server: derive do host
  const slug = getTenantFromHeaders(h);
  return slug
    ? {
        'x-tenant-subdomain': slug,
        'x-tenant-slug': slug,
      }
    : {};
}

/** Compat: função legada para módulos que ainda importam `detectTenantSlug`.
 *  Prioriza ?tenant= na URL (se houver), senão cai no getTenantSlug().
 */
export function detectTenantSlug(): string | null {
  try {
    // se existir query (?tenant=), respeita primeiro
    if (typeof window !== 'undefined') {
      const qs = new URL(window.location.href).searchParams.get('tenant');
      if (qs && qs.trim()) return qs.trim().toLowerCase();
    }
  } catch {
    // ignore
  }
  // fallback para a lógica padrão (host -> storage -> env)
  return getTenantSlug();
}
