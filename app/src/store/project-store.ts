"use client";

import { create } from "zustand";

const STORAGE_KEY = "blockintel-active-project";

type ProjectState = {
  activeProjectId: string | null;
  hydrated: boolean;
  restore: () => void;
  setActiveProjectId: (id: string | null) => void;
};

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStored(id: string | null) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable (private mode, disabled cookies, etc.) - selection just won't persist
  }
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  activeProjectId: null,
  hydrated: false,

  restore: () => {
    if (get().hydrated) return;
    set({ activeProjectId: readStored(), hydrated: true });
  },

  setActiveProjectId: (id) => {
    writeStored(id);
    set({ activeProjectId: id });
  },
}));
