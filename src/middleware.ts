// src/middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_APP_DOMAIN = (process.env.NEXT_PUBLIC_APP_DOMAIN ?? "harpersystem.com.br").toLowerCase();
const TENANT_COOKIE = "tenantSlug";

// Páginas públicas (não inclui /api — /api é excluído pelo matcher)
const PUBLIC_PATHS = ["/login", "/logout"];

/* ----------------- utils ----------------- */
function stripPort(host: string) {
  // ex.: "www.harpersystem.com.br:443" -> "www.harpersystem.com.br"
  return (host || "").split(":")[0];
}

function getTenantFromHost(hostname: string): string | null {
  const base = stripPort((hostname || "").toLowerCase());
  if (!base) return null;

  // DEV: acme.localhost
  if (base.endsWith(".localhost")) {
    const sub = base.slice(0, -".localhost".length);
    // ignora "www" em dev também
    return sub && sub !== "www" ? sub : null;
  }

  // PROD: exatamente o domínio raiz -> sem tenant (www não é tenant)
  if (base === PUBLIC_APP_DOMAIN) return null;

  // PROD: <sub>.<PUBLIC_APP_DOMAIN>
  if (base.endsWith(`.${PUBLIC_APP_DOMAIN}`)) {
    const sub = base.slice(0, -(PUBLIC_APP_DOMAIN.length + 1));
    // não considerar "www" como tenant
    return sub && sub !== "www" ? sub : null;
  }

  return null;
}

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function resolveTenant(req: NextRequest): string | null {
  // 1) query param
  const qp = req.nextUrl.searchParams.get("tenant") || req.nextUrl.searchParams.get("t");
  if (qp?.trim()) return qp.trim().toLowerCase();

  // 2) subdomínio
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const fromHost = getTenantFromHost(host);
  if (fromHost) return fromHost;

  // 3) cookie previamente salvo pelo /api/auth/session
  const fromCookie = req.cookies.get(TENANT_COOKIE)?.value?.trim().toLowerCase();
  if (fromCookie) return fromCookie;

  // 4) fallback global do app
  const envSlug = process.env.NEXT_PUBLIC_TENANT_SLUG?.trim()?.toLowerCase();
  return envSlug || null;
}

/* --------------- middleware --------------- */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Deriva tenant cedo (usa em redirects e headers de conveniência)
  const tenant = resolveTenant(req);

  // Checagem só para PÁGINAS (não /api — ver matcher)
  const isPublic = isPublicPath(pathname);
  const hasAT = Boolean(req.cookies.get("hs_at")?.value); // mantenha o nome igual ao criado em setAuthCookies

  // 1) Bloqueia rotas privadas sem cookie de acesso
  if (!isPublic && !hasAT) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    if (tenant) url.searchParams.set("tenant", tenant);
    url.searchParams.set("next", pathname + (search || ""));
    return NextResponse.redirect(url);
  }

  // 2) Já autenticado e acessando /login → manda para destino (next) ou /clients
  if (isPublic && hasAT && pathname === "/login") {
    const nextParam = req.nextUrl.searchParams.get("next");
    const dest = nextParam && nextParam.startsWith("/") ? nextParam : "/clients";
    const [destPath, destQs] = dest.split("?");
    const url = req.nextUrl.clone();
    url.pathname = destPath || "/clients";
    url.search = destQs ? `?${destQs}` : "";
    return NextResponse.redirect(url);
  }

  // 3) (Opcional) Propaga headers de conveniência para páginas server-side
  const requestHeaders = new Headers(req.headers);
  if (tenant) {
    requestHeaders.set("x-tenant-subdomain", tenant);
    requestHeaders.set("x-tenant-slug", tenant);
  }

  // Evita cache agressivo de páginas por proxies/CDNs
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

/**
 * Importante:
 * - Exclui /api da execução (para NÃO bloquear o route handler /api/auth/session).
 * - Exclui _next e quaisquer arquivos estáticos (.*).
 */
export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
