import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Prefs, Theme, Accent, EditorFont } from "../types";

const DEFAULT: Prefs = { theme: "dark", accent: "amber", editorFont: "Serif" };
const KEY = "folio.prefs";

interface Ctx {
  prefs: Prefs;
  setTheme: (t: Theme) => void; setAccent: (a: Accent) => void; setEditorFont: (f: EditorFont) => void;
}
const PrefsCtx = createContext<Ctx | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(() => {
    try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; } catch { return DEFAULT; }
  });
  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute("data-theme", prefs.theme);
    el.setAttribute("data-accent", prefs.accent);
    el.setAttribute("data-editorfont", prefs.editorFont);
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* noop in test envs */ }
  }, [prefs]);
  return (
    <PrefsCtx.Provider value={{
      prefs,
      setTheme: (theme) => setPrefs((p) => ({ ...p, theme })),
      setAccent: (accent) => setPrefs((p) => ({ ...p, accent })),
      setEditorFont: (editorFont) => setPrefs((p) => ({ ...p, editorFont })),
    }}>{children}</PrefsCtx.Provider>
  );
}
export function usePrefs() {
  const c = useContext(PrefsCtx);
  if (!c) throw new Error("usePrefs outside provider");
  return c;
}
