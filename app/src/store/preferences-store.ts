"use client";

import { create } from "zustand";

export type Theme = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";
export type EditorColorKey = "keyword" | "comment" | "string" | "number";
export type EditorColors = Record<EditorColorKey, string>;

// Keep in sync with the blocking theme script in layout.tsx, which reads
// this same key before hydration to set data-theme without a flash.
const STORAGE_KEY = "blockintel-preferences";

export const MIN_FONT_SIZE = 10;
export const MAX_FONT_SIZE = 24;
export const MIN_TAB_SIZE = 2;
export const MAX_TAB_SIZE = 8;

// Defaults mirror the app's own accent/success/warning/muted colors, so an
// un-customized editor still matches the rest of the UI.
export const DEFAULT_EDITOR_COLORS: EditorColors = {
  keyword: "#3b82f6",
  comment: "#94a3b8",
  string: "#10b981",
  number: "#f59e0b",
};

type StoredPreferences = {
  theme: Theme;
  editorFontSize: number;
  editorWordWrap: boolean;
  editorTabSize: number;
  editorMinimap: boolean;
  editorColors: EditorColors;
};

const DEFAULT_PREFERENCES: StoredPreferences = {
  theme: "dark",
  editorFontSize: 13,
  editorWordWrap: false,
  editorTabSize: 4,
  editorMinimap: false,
  editorColors: DEFAULT_EDITOR_COLORS,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function readStoredPreferences(): StoredPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const stored = JSON.parse(raw) as Partial<StoredPreferences>;
    return {
      ...DEFAULT_PREFERENCES,
      ...stored,
      editorColors: { ...DEFAULT_EDITOR_COLORS, ...stored.editorColors },
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function writeStoredPreferences(preferences: StoredPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // storage unavailable (private mode, disabled cookies, etc.) - preferences just won't persist
  }
}

function systemPrefersLight() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: light)").matches
  );
}

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === "system" ? (systemPrefersLight() ? "light" : "dark") : theme;
}

function applyResolvedTheme(resolved: ResolvedTheme) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", resolved);
  }
}

type PreferencesState = StoredPreferences & {
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  setEditorFontSize: (size: number) => void;
  setEditorWordWrap: (wordWrap: boolean) => void;
  setEditorTabSize: (size: number) => void;
  setEditorMinimap: (enabled: boolean) => void;
  setEditorColor: (key: EditorColorKey, value: string) => void;
  resetEditorColors: () => void;
};

const initialPreferences = readStoredPreferences();

export const usePreferencesStore = create<PreferencesState>((set, get) => {
  function updateAndPersist(partial: Partial<PreferencesState>) {
    set(partial);
    const next = get();
    writeStoredPreferences({
      theme: next.theme,
      editorFontSize: next.editorFontSize,
      editorWordWrap: next.editorWordWrap,
      editorTabSize: next.editorTabSize,
      editorMinimap: next.editorMinimap,
      editorColors: next.editorColors,
    });
  }

  return {
    ...initialPreferences,
    resolvedTheme: resolveTheme(initialPreferences.theme),

    setTheme: (theme) => {
      const resolved = resolveTheme(theme);
      applyResolvedTheme(resolved);
      updateAndPersist({ theme, resolvedTheme: resolved });
    },

    setEditorFontSize: (size) =>
      updateAndPersist({ editorFontSize: clamp(size, MIN_FONT_SIZE, MAX_FONT_SIZE) }),

    setEditorWordWrap: (editorWordWrap) => updateAndPersist({ editorWordWrap }),

    setEditorTabSize: (size) =>
      updateAndPersist({ editorTabSize: clamp(size, MIN_TAB_SIZE, MAX_TAB_SIZE) }),

    setEditorMinimap: (editorMinimap) => updateAndPersist({ editorMinimap }),

    setEditorColor: (key, value) =>
      updateAndPersist({ editorColors: { ...get().editorColors, [key]: value } }),

    resetEditorColors: () => updateAndPersist({ editorColors: DEFAULT_EDITOR_COLORS }),
  };
});

// Re-resolve "system" whenever the OS-level scheme flips while a tab is open.
if (typeof window !== "undefined") {
  window
    .matchMedia("(prefers-color-scheme: light)")
    .addEventListener("change", () => {
      if (usePreferencesStore.getState().theme !== "system") return;
      const resolved = resolveTheme("system");
      applyResolvedTheme(resolved);
      usePreferencesStore.setState({ resolvedTheme: resolved });
    });
}
