"use client";

/**
 * ThemeProvider — manages light/dark mode preference.
 *
 * On mount, reads the stored preference from localStorage (falling back to
 * the OS preference via prefers-color-scheme) and applies the `dark` class
 * to <html>. Exposes { dark, toggle } via context so any client component
 * (e.g. HamburgerMenu) can read and change the theme without prop drilling.
 *
 * suppressHydrationWarning must be set on <html> in layout.tsx to suppress
 * the React class mismatch warning that would otherwise appear on the first
 * render before the client can read localStorage.
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
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : prefersDark;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      localStorage.setItem("theme", next ? "dark" : "light");
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
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
