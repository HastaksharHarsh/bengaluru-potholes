import { create } from "zustand";

interface AppState {
  isSupervisor: boolean;
  toggleSupervisor: () => void;
  version: number; // to force re-renders on mutation
  bumpVersion: () => void;
  savedReports: any[]; // Stores the JSON files for further use
  saveReport: (report: any) => void;
  clearReports: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isSupervisor: false,
  toggleSupervisor: () => set((state) => ({ isSupervisor: !state.isSupervisor })),
  version: 0,
  bumpVersion: () => set((state) => ({ version: state.version + 1 })),
  savedReports: JSON.parse(localStorage.getItem('savedReports') || '[]'),
  saveReport: (report) => set((state) => {
    const updated = [report, ...state.savedReports];
    localStorage.setItem('savedReports', JSON.stringify(updated));
    return { savedReports: updated };
  }),
  clearReports: () => set(() => {
    localStorage.removeItem('savedReports');
    return { savedReports: [] };
  }),
}));
