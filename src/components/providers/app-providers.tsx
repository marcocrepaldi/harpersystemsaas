"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "@/stores/auth";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [qc] = React.useState(() => new QueryClient());
  const hydrated = useAuth((s) => s.hydrated);
  const hydrateFromStorage = useAuth((s) => s.hydrateFromStorage);

  React.useEffect(() => {
    if (!hydrated) hydrateFromStorage();
  }, [hydrated, hydrateFromStorage]);

  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
