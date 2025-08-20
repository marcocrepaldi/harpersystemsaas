// components/auth/protected.tsx
"use client";

import * as React from "react";

export function Protected({ children }: { children: React.ReactNode }) {
  // Estratégia simples: só checa tokens no localStorage (indep. de Zustand)
  const [ready, setReady] = React.useState(false);
  const [ok, setOk] = React.useState(false);

  React.useEffect(() => {
    const at = localStorage.getItem("accessToken");
    const u = localStorage.getItem("currentUser");
    setOk(!!at && !!u);
    setReady(true);
  }, []);

  React.useEffect(() => {
    if (ready && !ok) {
      // mantém o tenant na URL do login (se houver)
      const usp = new URLSearchParams(window.location.search);
      const currentTenant =
        usp.get("tenant") || usp.get("t") || localStorage.getItem("tenantSlug");
      const qs = currentTenant ? `?tenant=${encodeURIComponent(currentTenant)}` : "";
      window.location.replace(`/login${qs}`);
    }
  }, [ready, ok]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-sm text-muted-foreground">Carregando…</div>
      </div>
    );
  }
  if (!ok) return null;

  return <>{children}</>;
}
