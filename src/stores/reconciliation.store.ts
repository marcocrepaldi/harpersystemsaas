import { create } from "zustand";
import { ReconciliationResult } from "@/app/types/health";

type State = {
  result?: ReconciliationResult;
  selected: {
    divergencias: Set<string>;
    aMais: Set<string>;
    aMenos: Set<string>;
  };
};

type Actions = {
  setResult: (r?: ReconciliationResult) => void;
  toggle: (list: "divergencias" | "aMais" | "aMenos", id: string) => void;
  clear: () => void;
};

export const useReconciliationStore = create<State & Actions>((set) => ({
  result: undefined,
  selected: {
    divergencias: new Set(),
    aMais: new Set(),
    aMenos: new Set(),
  },
  setResult: (r) =>
    set({
      result: r,
      selected: {
        divergencias: new Set(),
        aMais: new Set(),
        aMenos: new Set(),
      },
    }),
  toggle: (list, id) =>
    set((s) => {
      const target = new Set(s.selected[list]);
      target.has(id) ? target.delete(id) : target.add(id);
      return { selected: { ...s.selected, [list]: target } };
    }),
  clear: () =>
    set({
      result: undefined,
      selected: {
        divergencias: new Set(),
        aMais: new Set(),
        aMenos: new Set(),
      },
    }),
}));
