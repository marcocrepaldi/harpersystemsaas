"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { detectTenantSlug, saveTenantSlug } from "@/lib/tenant";
import { errorMessage } from "@/lib/errors";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/stores/auth";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "USER";
    corretorId: string;
  };
};

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter();
  const params = useSearchParams();

  // hidrata o Zustand após salvar tokens no storage
  const hydrateFromStorage = useAuth((s) => s.hydrateFromStorage);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [tenantSlug, setTenantSlug] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  // rota pós-login (?next=...) — sanear para evitar open-redirect
  const nextParam = params.get("next") || "/dashboard";
  const nextSafe = nextParam.startsWith("/") ? nextParam : "/dashboard";

  // Detecta/prioriza o slug ao montar (query > subdomínio > LS > env)
  React.useEffect(() => {
    const fromQuery = (params.get("tenant") || params.get("t"))?.trim();
    if (fromQuery) {
      saveTenantSlug(fromQuery);
      setTenantSlug(fromQuery);
      return;
    }
    const detected = detectTenantSlug();
    if (detected) {
      saveTenantSlug(detected);
      setTenantSlug(detected);
    } else {
      setTenantSlug(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!tenantSlug) {
      toast.error("Tenant não identificado", {
        description:
          "Use acme.localhost:3000, adicione ?tenant=acme na URL ou defina NEXT_PUBLIC_TENANT_SLUG no .env.local.",
      });
      return;
    }

    const emailNorm = email.trim().toLowerCase();
    const passwordNorm = password;

    if (!emailNorm || !passwordNorm) {
      toast.error("Preencha e-mail e senha.");
      return;
    }

    setIsLoading(true);
    try {
      // Headers EXPLÍCITOS p/ garantir parsing do Nest
      const res = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-subdomain": tenantSlug, // força o tenant no primeiro login
        },
        skipAuthRedirect: true,
        // NÃO usar JSON.stringify — apiFetch serializa quando Content-Type é JSON
        body: { email: emailNorm, password: passwordNorm },
      });

      // tokens/user no localStorage + tenant
      localStorage.setItem("accessToken", res.accessToken);
      localStorage.setItem("refreshToken", res.refreshToken);
      localStorage.setItem("currentUser", JSON.stringify(res.user));
      saveTenantSlug(tenantSlug);

      try {
        hydrateFromStorage?.();
      } catch {
        // ignore
      }

      // Cria cookies HttpOnly (para middleware)
      const cookieResp = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
        }),
      });

      if (!cookieResp.ok) {
        const msg = await cookieResp.text().catch(() => "");
        throw new Error(msg || "Falha ao criar sessão (cookies).");
      }

      await new Promise((ok) => setTimeout(ok, 30));

      toast.success(`Bem-vindo(a), ${res.user.name}!`);
      router.replace(nextSafe);
      setTimeout(() => router.refresh(), 50);
    } catch (err) {
      toast.error("Erro ao entrar", { description: errorMessage(err) });
    } finally {
      setIsLoading(false);
    }
  }

  function loginWithGoogle() {
    toast.info("Login com Google indisponível neste ambiente.");
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props} aria-busy={isLoading}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>Enter your email below to login to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-6">
              <div className="text-xs text-muted-foreground -mt-1">
                Tenant atual: <span className="font-medium">{tenantSlug ?? "— não definido —"}</span>
              </div>

              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                    onClick={(e) => e.preventDefault()}
                  >
                    Forgot your password?
                  </a>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-2 my-auto rounded px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    disabled={isLoading}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Entrando..." : "Login"}
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={loginWithGoogle} disabled={isLoading}>
                  Login with Google
                </Button>
              </div>
            </div>

            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <a href="#" className="underline underline-offset-4" onClick={(e) => e.preventDefault()}>
                Sign up
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
