/* eslint-disable @typescript-eslint/no-explicit-any */
import { detectTenantSlug } from "@/lib/tenant";
import { errorMessage } from "@/lib/errors";

export type ApiFetchOptions = {
  method?: string;
  headers?: HeadersInit;
  body?: any; // objeto, string, FormData, Blob, ArrayBuffer, URLSearchParams...
  query?: Record<
    string,
    | string
    | number
    | boolean
    | null
    | undefined
    | Array<string | number | boolean | null | undefined>
  >;
  /** Evita redirecionar automaticamente para /login em 401 */
  skipAuthRedirect?: boolean;
  /** Permite trocar a base puntualmente (padrão vem do .env) */
  baseUrl?: string;
  /** Suporte a AbortController */
  signal?: AbortSignal | null;

  /** Força tipo de resposta; por padrão auto-detecta pelo Content-Type */
  responseType?: "json" | "text" | "blob";
  /** Timeout em ms (client-side via AbortController encadeado) */
  timeoutMs?: number;
  /** Re-tentativas (ex.: 429/503). 0 = desativado (default) */
  retries?: number;
  /** Delay base entre tentativas (ms) quando não houver Retry-After */
  retryDelayMs?: number;
  /** Callback extra ao receber 401 (além do redirecionamento padrão) */
  onUnauthorized?: () => void;
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
    try {
      if (at) localStorage.setItem("accessToken", at);
      else localStorage.removeItem("accessToken");

      if (rt) localStorage.setItem("refreshToken", rt);
      else localStorage.removeItem("refreshToken");

      if (user) localStorage.setItem("currentUser", JSON.stringify(user));
      else localStorage.removeItem("currentUser");
    } catch {
      // ambientes com storage bloqueado (private mode etc.)
    }
  }
}

export function clearAuth() {
  memAT = null;
  memRT = null;
  memUser = null;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("currentUser");
    } catch {
      // ignore
    }
  }
}

function getAccessToken(): string | null {
  if (memAT) return memAT;
  if (typeof window !== "undefined") {
    try {
      return localStorage.getItem("accessToken");
    } catch {
      return null;
    }
  }
  return null;
}

/** ---------------- Helpers ---------------- */
function isAbsoluteUrl(path: string) {
  // http/https + também suporta URLs "protocol-relative" //host/path
  return /^https?:\/\//i.test(path) || /^\/\//.test(path);
}

function buildUrl(
  path: string,
  baseUrl?: string,
  query?: ApiFetchOptions["query"]
) {
  // Se já for absoluta, só aplica query
  if (isAbsoluteUrl(path)) {
    const url = new URL(path, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (Array.isArray(v)) {
          v.forEach((item) => {
            if (item === undefined || item === null || item === "") return;
            url.searchParams.append(k, String(item));
          });
          return;
        }
        if (v === undefined || v === null || v === "") return;
        url.searchParams.set(k, String(v));
      });
    }
    return url.toString();
  }

  const base = (baseUrl || DEFAULT_BASE).replace(/\/+$/, "");
  const clean = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${clean}`);

  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        v.forEach((item) => {
          if (item === undefined || item === null || item === "") return;
          url.searchParams.append(k, String(item));
        });
        return;
      }
      if (v === undefined || v === null || v === "") return;
      url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

function isFormLike(b: any) {
  return typeof FormData !== "undefined" && b instanceof FormData;
}
function isUrlParams(b: any) {
  return typeof URLSearchParams !== "undefined" && b instanceof URLSearchParams;
}

function ensureSerializedBody(body: any, headers: Headers) {
  if (body == null) return undefined;

  // FormData/Blob/File/ArrayBuffer/URLSearchParams → envia como está
  if (
    isFormLike(body) ||
    (typeof Blob !== "undefined" && body instanceof Blob) ||
    body instanceof ArrayBuffer ||
    isUrlParams(body)
  ) {
    // ⚠️ Não setar Content-Type para FormData: o browser define boundary automaticamente
    if (isFormLike(body) && headers.has("Content-Type")) {
      headers.delete("Content-Type");
    }
    // Para URLSearchParams, se header não for definido, o browser define o correto.
    return body;
  }

  // Se já é string, não re-serializa
  if (typeof body === "string") return body;

  // Se o chamador setou x-www-form-urlencoded e mandou um objeto,
  // serializamos automaticamente para URLSearchParams
  const ctHeader = headers.get("Content-Type") || "";
  if (ctHeader.toLowerCase().includes("application/x-www-form-urlencoded")) {
    const usp = new URLSearchParams();
    Object.entries(body as Record<string, any>).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (Array.isArray(v)) {
        v.forEach((it) => {
          if (it === undefined || it === null) return;
          usp.append(k, String(it));
        });
      } else {
        usp.set(k, String(v));
      }
    });
    // o browser definirá o header correto com charset
    headers.delete("Content-Type");
    return usp;
  }

  // JSON por padrão
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const ct = headers.get("Content-Type") || "";
  if (ct.toLowerCase().includes("application/json")) {
    return JSON.stringify(body);
  }

  // Se Content-Type foi definido para algo não-JSON, o chamador deve prover string/Blob/ArrayBuffer/URLSearchParams
  return body;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseRetryAfter(h: string | null): number | null {
  if (!h) return null;
  // pode ser segundos ou data absoluta
  const secs = Number(h);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const date = Date.parse(h);
  if (!Number.isNaN(date)) {
    const diff = date - Date.now();
    return diff > 0 ? diff : 0;
  }
  return null;
}

async function resolveResponse<T>(
  res: Response,
  forcedType?: ApiFetchOptions["responseType"]
): Promise<T> {
  // 204 (No Content) / 205 (Reset Content)
  if (res.status === 204 || res.status === 205) return undefined as unknown as T;

  if (forcedType === "blob") return (await res.blob()) as unknown as T;
  if (forcedType === "text") return (await res.text()) as unknown as T;
  if (forcedType === "json") {
    // tenta json; se falhar, devolve string
    const text = await res.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  // auto-detecta pelo content-type e content-disposition
  const ct = (res.headers.get("Content-Type") || "").toLowerCase();
  const cd = res.headers.get("Content-Disposition") || "";
  const isAttachment = /attachment/i.test(cd);

  if (isAttachment || /octet-stream|excel|csv|zip|pdf/.test(ct)) {
    return (await res.blob()) as unknown as T;
  }

  if (ct.includes("application/json") || ct.includes("application/problem+json")) {
    const text = await res.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      // fallback para JSONL ou resposta não-JSON com header errado
      return text as unknown as T;
    }
  }

  // default: texto
  return (await res.text()) as unknown as T;
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
    signal,

    responseType,
    timeoutMs,
    retries = 0,
    retryDelayMs = 800,
    onUnauthorized,
  } = opts;

  const url = buildUrl(path, baseUrl, query);
  const headers = new Headers(inputHeaders);

  // Accept padrão
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json, text/plain, */*");
  }
  // Header comum para diferenciação em proxies/backends
  if (!headers.has("X-Requested-With")) {
    headers.set("X-Requested-With", "XMLHttpRequest");
  }

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

  // Timeout controller (encadeia com signal, se houver)
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const signals: AbortSignal[] = [];
  if (signal) signals.push(signal);
  if (ctrl) signals.push(ctrl.signal);

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  if (ctrl && timeoutMs && timeoutMs > 0) {
    timeoutId = setTimeout(() => ctrl.abort(), timeoutMs);
  }

  // helper para chamar fetch (permite retries)
  const doFetch = async (): Promise<Response> => {
    // Unifica signals via AbortSignal.any (se disponível)
    const anyFn = (AbortSignal as any)?.any;
    const finalSignal =
      typeof anyFn === "function" && signals.length > 1 ? anyFn(signals) : signals[0];

    return fetch(url, {
      method,
      headers,
      body: ["GET", "HEAD"].includes(method.toUpperCase()) ? undefined : serializedBody,
      credentials: "same-origin",
      cache: "no-store",
      signal: finalSignal,
      // redirect: "follow" // default
    });
  };

  let attempt = 0;
  let res: Response | null = null;
  let lastErr: unknown;

  while (attempt <= retries) {
    try {
      res = await doFetch();
      // sucesso ou erro não-retryable
      if (res.status !== 429 && res.status !== 503) break;

      // retryable: espera Retry-After ou fallback
      if (attempt === retries) break;
      const ra = parseRetryAfter(res.headers.get("Retry-After"));
      await sleep(ra ?? retryDelayMs * Math.pow(2, attempt)); // backoff exponencial simples
    } catch (e) {
      lastErr = e;
      // só tentar de novo em erros de rede/Abort? tentamos até limite
      if (attempt === retries) break;
      await sleep(retryDelayMs * Math.pow(2, attempt));
    }
    attempt++;
  }

  if (timeoutId) clearTimeout(timeoutId);
  if (!res) {
    // estourou em erro de rede/abort
    const msg =
      (lastErr as any)?.name === "AbortError"
        ? "A requisição foi cancelada."
        : "Falha de rede. Tente novamente.";
    throw new Error(msg);
  }

  if (!res.ok) {
    // trata 401
    if (res.status === 401) {
      onUnauthorized?.();
      if (!skipAuthRedirect && typeof window !== "undefined") {
        try {
          clearAuth();
        } catch {
          // ignore
        }
        // Evita múltiplos redirects simultâneos
        const w = window as any;
        if (!w.__redirectingToLogin) {
          w.__redirectingToLogin = true;
          const next = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `/login?next=${next}`;
        }
      }
    }

    const raw = await resolveResponse<any>(res, responseType ?? "json");

    // tenta extrair mensagem em diferentes formatos
    let rawMsg: string | undefined;
    if (raw && typeof raw === "object") {
      rawMsg =
        (raw as any).message ??
        (raw as any).error ??
        ((Array.isArray((raw as any).errors) && (raw as any).errors[0]?.message) || undefined);
    } else if (typeof raw === "string") {
      rawMsg = raw;
    }

    // monta uma mensagem enxuta e segura (sem base64, truncada)
    let message = rawMsg || `HTTP ${res.status}`;
    message = errorMessage(message);

    // mensagens mais amigáveis para códigos comuns
    if (res.status === 413) {
      message = "Arquivo muito grande para enviar.";
    }

    const err = new Error(message) as Error & {
      status?: number;
      url?: string;
      data?: unknown;
    };
    err.status = res.status;
    err.url = url;
    err.data = raw;

    throw err;
  }

  return (await resolveResponse<T>(res, responseType)) as T;
}
