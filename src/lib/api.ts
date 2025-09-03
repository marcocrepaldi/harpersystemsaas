/* eslint-disable @typescript-eslint/no-explicit-any */
import { detectTenantSlug } from "@/lib/tenant";
import { errorMessage } from "@/lib/errors";

export type ApiFetchOptions = {
  method?: string;
  headers?: HeadersInit;
  body?: any; // objeto, string, FormData etc.
  query?: Record<string, string | number | boolean | null | undefined>;
  /** Evita redirecionar automaticamente para /login em 401 */
  skipAuthRedirect?: boolean;
  /** Permite trocar a base puntualmente (padrão vem do .env) */
  baseUrl?: string;
  /** Suporte a AbortController */
  signal?: AbortSignal | null;
};

const DEFAULT_BASE =
  (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "") ||
  "http://localhost:3001/api";

/** ---------------- Tokens em memória + LocalStorage ---------------- */
type StoredUser =
  | {
      id: string;
      name: string;
      email: string;
      role: "ADMIN" | "USER";
      corretorId: string;
    }
  | null;

let memAT: string | null = null;
let memRT: string | null = null;
let memUser: StoredUser = null;

export function setTokens(at?: string | null, rt?: string | null, user?: StoredUser) {
  memAT = at ?? null;
  memRT = rt ?? null;
  memUser = user ?? null;

  if (typeof window !== "undefined") {
    if (at) localStorage.setItem("accessToken", at);
    else localStorage.removeItem("accessToken");

    if (rt) localStorage.setItem("refreshToken", rt);
    else localStorage.removeItem("refreshToken");

    if (user) localStorage.setItem("currentUser", JSON.stringify(user));
    else localStorage.removeItem("currentUser");
  }
}

export function clearAuth() {
  memAT = null;
  memRT = null;
  memUser = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("currentUser");
  }
}

function getAccessToken(): string | null {
  if (memAT) return memAT;
  if (typeof window !== "undefined") return localStorage.getItem("accessToken");
  return null;
}

/** ---------------- Helpers ---------------- */
function buildUrl(path: string, baseUrl?: string, query?: ApiFetchOptions["query"]) {
  const base = (baseUrl || DEFAULT_BASE).replace(/\/+$/, "");
  const clean = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${clean}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

function isFormLike(b: any) {
  return typeof FormData !== "undefined" && b instanceof FormData;
}

function ensureSerializedBody(body: any, headers: Headers) {
  if (body == null) return undefined;

  // FormData/Blob/ArrayBuffer → envia como está
  if (
    isFormLike(body) ||
    (typeof Blob !== "undefined" && body instanceof Blob) ||
    body instanceof ArrayBuffer
  ) {
    // ⚠️ Não setar Content-Type para FormData: o browser define boundary automaticamente
    if (isFormLike(body) && headers.has("Content-Type")) {
      headers.delete("Content-Type");
    }
    return body;
  }

  // Se já é string, não re-serializa
  if (typeof body === "string") return body;

  // JSON por padrão
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const ct = headers.get("Content-Type") || "";
  if (ct.toLowerCase().includes("application/json")) {
    return JSON.stringify(body);
  }

  // Se Content-Type foi definido para algo não-JSON, o chamador deve prover string/Blob
  return body;
}

/** ---------------- apiFetch ---------------- */
export async function apiFetch<T = unknown>(
  path: string,
  opts: ApiFetchOptions = {}
): Promise<T> {
  const {
    method = "GET",
    headers: inputHeaders,
    body,
    query,
    skipAuthRedirect = false,
    baseUrl,
    signal, // <- novo
  } = opts;

  const url = buildUrl(path, baseUrl, query);
  const headers = new Headers(inputHeaders);

  // Tenant
  const tenant = detectTenantSlug();
  if (tenant && !headers.has("x-tenant-subdomain")) {
    headers.set("x-tenant-subdomain", tenant);
  }

  // Auth
  const at = getAccessToken();
  if (at && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${at}`);
  }

  const serializedBody = ensureSerializedBody(body, headers);

  const res = await fetch(url, {
    method,
    headers,
    body: ["GET", "HEAD"].includes(method.toUpperCase()) ? undefined : serializedBody,
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });

  // 204 / sem body
  if (res.status === 204) return undefined as unknown as T;

  const text = await res.text();
  const parseJSON = () => {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  };

  if (!res.ok) {
    // redireciona 401 (se permitido)
    if (res.status === 401 && !skipAuthRedirect && typeof window !== "undefined") {
      try {
        clearAuth();
      } catch {
        // ignore
      }
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?next=${next}`;
    }

    const data = parseJSON();

    // monta uma mensagem enxuta e segura (sem base64, truncada)
    let message =
      (data && typeof data === "object" && "message" in data && (data as any).message) ||
      (typeof data === "string" && data) ||
      `HTTP ${res.status}`;

    message = errorMessage(message);

    // mensagens mais amigáveis para códigos comuns
    if (res.status === 413) {
      message = "Arquivo muito grande para enviar.";
    }

    throw new Error(message);
  }

  return parseJSON() as T;
}
