import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Prefs, Theme, Accent, EditorFont } from "../types";
import { api } from "../api/client";

const DEFAULT: Prefs = { theme: "dark", accent: "amber", editorFont: "Serif" };
const KEY = "folio.prefs";

interface Ctx {
  prefs: Prefs;
  setTheme: (t: Theme) => void;
  setAccent: (a: Accent) => void;
  setEditorFont: (f: EditorFont) => void;
  setAll: (incoming: Prefs) => void;
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
      setTheme: (theme) => {
        setPrefs((p) => ({ ...p, theme }));
        api.updatePrefs({ theme }).catch(() => {});
      },
      setAccent: (accent) => {
        setPrefs((p) => ({ ...p, accent }));
        api.updatePrefs({ accent }).catch(() => {});
      },
      setEditorFont: (editorFont) => {
        setPrefs((p) => ({ ...p, editorFont }));
        api.updatePrefs({ editorFont }).catch(() => {});
      },
      setAll: (incoming) => setPrefs((p) => ({ ...p, ...incoming })),
    }}>{children}</PrefsCtx.Provider>
  );
}
export function usePrefs() {
  const c = useContext(PrefsCtx);
  if (!c) throw new Error("usePrefs outside provider");
  return c;
}
