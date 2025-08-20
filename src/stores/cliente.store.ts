import { create } from "zustand";

export type Cliente = { id: string; nome: string; cnpj?: string | null };

type State = {
  current?: Cliente;
};
type Actions = {
  setCurrent: (c?: Cliente) => void;
};

const LS_KEY = "health.currentCliente";

export const useClienteStore = create<State & Actions>((set) => ({
  current: undefined,
  setCurrent: (c) => {
    set({ current: c });
    try {
      if (c) localStorage.setItem(LS_KEY, JSON.stringify(c));
      else localStorage.removeItem(LS_KEY);
    } catch {}
  },
}));

export function loadClienteFromStorage(): Cliente | undefined {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw) as Cliente;
  } catch {
    return undefined;
  }
}
