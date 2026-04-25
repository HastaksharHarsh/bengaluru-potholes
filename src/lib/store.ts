import { create } from "zustand";

interface AppState {
  isSupervisor: boolean;
  toggleSupervisor: () => void;
  version: number; // to force re-renders on mutation
  bumpVersion: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isSupervisor: false,
  toggleSupervisor: () => set((state) => ({ isSupervisor: !state.isSupervisor })),
  version: 0,
  bumpVersion: () => set((state) => ({ version: state.version + 1 })),
}));
