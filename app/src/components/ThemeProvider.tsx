"use client";

/**
 * ThemeProvider — manages light/dark mode preference.
 *
 * layout.tsx injects a tiny inline <script> into <head> that reads localStorage
 * and sets <html class="dark"> before React renders — this prevents any flash
 * of the wrong theme. ThemeProvider then reads the already-applied class via a
 * lazy useState initializer (no effect needed, so no setState-in-effect lint
 * violation). A single useEffect syncs the DOM and localStorage whenever the
 * toggle state changes — the canonical React pattern for "update an external
 * system when state changes". Exposes { dark, toggle } via context so any
 * client component (e.g. HamburgerMenu) can read and change the theme.
 *
 * suppressHydrationWarning on <html> in layout.tsx suppresses the React class
 * mismatch warning that would appear because the server renders without "dark".
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type ThemeContextValue = {
  dark: boolean;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  dark: false,
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Lazy initializer: read the class already set by the inline <head> script.
  // Returns false on the server (no window) — suppressed by suppressHydrationWarning.
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  // Sync DOM class and localStorage whenever `dark` changes (toggle).
  // This is the correct React pattern: update external systems from state,
  // not the other way around. Does NOT run for initialization — state is
  // already in sync thanks to the lazy initializer above.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const toggle = useCallback(() => {
    setDark((prev) => !prev);
  }, []);

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
