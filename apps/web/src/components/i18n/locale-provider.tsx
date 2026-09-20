"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type Locale = "en" | "zh";

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
}>({ locale: "en", setLocale: () => undefined });

function initialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem("lifeos-locale");
  return saved === "zh" ? "zh" : "en";
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  function setLocale(next: Locale) {
    setLocaleState(next);
    window.localStorage.setItem("lifeos-locale", next);
    document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
  }

  const value = useMemo(() => ({ locale, setLocale }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
