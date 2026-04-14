"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

function getResolvedTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const t = localStorage.getItem("theme");
  if (t === "dark") return "dark";
  if (t === "light") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(resolved: "light" | "dark") {
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export function useThemePreference() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    const t = localStorage.getItem("theme");
    if (t === "dark" || t === "light" || t === "system") return t;
    return "system";
  });

  useEffect(() => {
    applyTheme(getResolvedTheme());
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") applyTheme(getResolvedTheme());
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = (value: Theme) => {
    setThemeState(value);
    if (value === "system") {
      localStorage.removeItem("theme");
    } else {
      localStorage.setItem("theme", value);
    }
    applyTheme(value === "system" ? getResolvedTheme() : value);
  };

  const resolved = theme === "system"
    ? (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme;

  return { theme, resolvedTheme: resolved, setTheme };
}
