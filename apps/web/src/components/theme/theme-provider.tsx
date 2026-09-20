"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ThemePreference = "dark" | "light" | "system";

const STORAGE_KEY = "lifeos-theme";
const ThemeContext = createContext<{
  theme: ThemePreference;
  setTheme: (t: ThemePreference) => void;
}>({ theme: "dark", setTheme: () => {} });

function resolve(pref: ThemePreference): "dark" | "light" {
  if (pref === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return pref;
}

function apply(resolved: "dark" | "light") {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

function initialPreference(): ThemePreference {
  if (typeof window === "undefined") return "dark";
  try {
    return (localStorage.getItem(STORAGE_KEY) as ThemePreference) || "dark";
  } catch {
    return "dark";
  }
}

/**
 * Theme switch — Dark (default) / Light / System. The class flip is the
 * whole mechanism: every color is a CSS variable driven by `html.dark`.
 * The layout's inline script applies the stored theme BEFORE first paint;
 * this provider owns the class for interactive switches.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(initialPreference);

  useEffect(() => {
    apply(resolve(theme));
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply(mq.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = (t: ThemePreference) => {
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // storage unavailable — the session still switches
    }
    setThemeState(t);
    apply(resolve(t));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
