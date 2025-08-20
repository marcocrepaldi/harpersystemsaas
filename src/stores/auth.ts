"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
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

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      hydrated: false,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) => {
        set({ user, accessToken, refreshToken, isAuthenticated: !!accessToken && !!user });
        setTokens(accessToken, refreshToken, user);
      },

      hydrateFromStorage: () => {
        try {
          const at = localStorage.getItem("accessToken");
          const rt = localStorage.getItem("refreshToken");
          const uStr = localStorage.getItem("currentUser");
          const u = uStr ? (JSON.parse(uStr) as User) : null;
          set({ user: u, accessToken: at || null, refreshToken: rt || null, isAuthenticated: !!at && !!u, hydrated: true });
        } catch {
          set({ hydrated: true });
        }
      },

      login: async (email, password) => {
        const data = await apiFetch<{ accessToken: string; refreshToken: string; user: User }>("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          skipAuthRedirect: true,
          body: { email, password },
        });
        setTokens(data.accessToken, data.refreshToken, data.user);
        set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken, isAuthenticated: true });
      },

      logout: async () => {
        try {
          await apiFetch("/auth/logout", { method: "POST" });
        } catch {}
        clearAuth();
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
    }),
    {
      name: "__authStore",
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken }),
    }
  )
);
