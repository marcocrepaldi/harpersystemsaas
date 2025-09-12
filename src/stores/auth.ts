"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { apiFetch, setTokens, clearAuth } from "@/lib/api";

type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  corretorId: string;
};

type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  isAuthenticated: boolean;

  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  hydrateFromStorage: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const TENANT = process.env.NEXT_PUBLIC_TENANT_SLUG ?? "harper";

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      hydrated: false,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) => {
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: !!accessToken && !!user,
        });
        setTokens(accessToken, refreshToken, user);
      },

      hydrateFromStorage: () => {
        try {
          if (typeof window === "undefined") {
            set({ hydrated: true });
            return;
          }
          const at = localStorage.getItem("accessToken");
          const rt = localStorage.getItem("refreshToken");
          const uStr = localStorage.getItem("currentUser");
          const u = uStr ? (JSON.parse(uStr) as User) : null;
          set({
            user: u,
            accessToken: at || null,
            refreshToken: rt || null,
            isAuthenticated: !!at && !!u,
            hydrated: true,
          });
        } catch {
          set({ hydrated: true });
        }
      },

      login: async (email, password) => {
        const data = await apiFetch<{
          accessToken: string;
          refreshToken: string;
          user: User;
        }>("/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-tenant-slug": TENANT,
          },
          skipAuthRedirect: true,
          body: { email, password },
        });

        setTokens(data.accessToken, data.refreshToken, data.user);
        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
        });
      },

      logout: async () => {
        try {
          await apiFetch("/auth/logout", {
            method: "POST",
            headers: { "x-tenant-slug": TENANT },
          });
        } catch {}
        clearAuth();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: "__authStore",
      storage: createJSONStorage(() => localStorage),

      // só persistimos o essencial
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
      }),

      // 🔧 versão atual do estado persistido
      version: 1,

      // 🔁 migração quando vier de versões antigas (ex.: 0 -> 1)
      migrate: (persisted: any, fromVersion: number) => {
        // persisted aqui é o objeto que você retornou em "partialize" (ou o estado inteiro se não usou partialize no passado)
        const user = persisted?.user ?? null;
        const accessToken = persisted?.accessToken ?? null;
        const refreshToken = persisted?.refreshToken ?? null;

        return {
          user,
          accessToken,
          refreshToken,
          hydrated: true,
          isAuthenticated: Boolean(accessToken && user),
        } as AuthState;
      },

      // marca como hidratado após rehidratar
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    }
  )
);