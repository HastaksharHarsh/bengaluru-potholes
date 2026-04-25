import { create } from "zustand";

interface AppState {
  isSupervisor: boolean;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  version: number;
  bumpVersion: () => void;
  savedReports: any[];
  saveReport: (report: any) => void;
  clearReports: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isSupervisor: !!localStorage.getItem("supervisorToken"),
  token: localStorage.getItem("supervisorToken"),
  login: (token: string) => {
    localStorage.setItem("supervisorToken", token);
    set({ isSupervisor: true, token });
  },
  logout: () => {
    localStorage.removeItem("supervisorToken");
    set({ isSupervisor: false, token: null });
  },
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
