// src/app/api/auth/session/route.ts
import { NextResponse } from "next/server";
import { setAuthCookies, clearAuthCookies } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function badRequest(msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status: 400, headers: NO_STORE });
}

export async function POST(req: Request) {
  // Parse seguro do corpo (JSON, form, fallback texto)
  let body: any = {};
  try {
    const ct = (req.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("application/json")) {
      body = await req.json();
    } else if (ct.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      body = Object.fromEntries(form.entries());
    } else {
      const txt = await req.text();
      body = txt ? JSON.parse(txt) : {};
    }
  } catch {
    return badRequest("Body inválido (JSON/form esperado).");
  }

  const accessToken =
    typeof body?.accessToken === "string" ? body.accessToken.trim() : "";
  const refreshToken =
    typeof body?.refreshToken === "string" ? body.refreshToken.trim() : undefined;

  if (!accessToken) return badRequest("accessToken ausente");

  // Grava cookies httpOnly dos tokens (implementado no seu lib/tokens)
  await setAuthCookies(accessToken, refreshToken);

  // (Opcional) fixa tenant em cookie de app se vier no header/body
  const tenant =
    (req.headers.get("x-tenant-subdomain") ||
      req.headers.get("x-tenant-slug") ||
      body?.tenantSlug ||
      "").trim();

  const res = NextResponse.json({ ok: true }, { headers: NO_STORE });

  if (tenant) {
    // Obs.: domínio opcional via AUTH_COOKIES_DOMAIN ou NEXT_PUBLIC_* se você expor
    const domain =
      process.env.AUTH_COOKIES_DOMAIN ||
      process.env.NEXT_PUBLIC_AUTH_COOKIES_DOMAIN ||
      undefined;

    res.cookies.set("tenantSlug", tenant, {
      httpOnly: false, // usado no client para redirecionamentos
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 dias
      domain,
    });
  }

  // Header auxiliar p/ debug rápido via curl
  res.headers.set("X-Session-Set", "1");
  return res;
}

export async function DELETE() {
  await clearAuthCookies();
  const res = NextResponse.json({ ok: true }, { headers: NO_STORE });
  // limpa também o cookie de tenant do app
  res.cookies.set("tenantSlug", "", { path: "/", maxAge: 0 });
  return res;
}

// Libera preflight caso algum cliente dispare OPTIONS
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: NO_STORE });
}
