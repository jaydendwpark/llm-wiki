"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export type Theme = "light" | "dark" | "kitsch" | "dog" | "cat";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children, initialTheme }: { children: ReactNode; initialTheme: Theme }) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    document.cookie = `theme=${t};path=/;max-age=31536000`;
    const html = document.documentElement;
    html.classList.forEach((c) => {
      if (c.startsWith("theme-")) html.classList.remove(c);
    });
    if (t !== "light") html.classList.add(`theme-${t}`);
  }, []);

  // Sync on mount in case cookie was set before SSR
  useEffect(() => {
    const html = document.documentElement;
    html.classList.forEach((c) => {
      if (c.startsWith("theme-")) html.classList.remove(c);
    });
    if (theme !== "light") html.classList.add(`theme-${theme}`);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
