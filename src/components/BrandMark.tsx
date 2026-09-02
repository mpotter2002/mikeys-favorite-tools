"use client";

import { useEffect, useState } from "react";
import { readTheme, type Theme } from "@/lib/theme";

export function BrandMark() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(readTheme());
    const syncTheme = (event: Event) => setTheme((event as CustomEvent<Theme>).detail);
    window.addEventListener("toolfolio-theme", syncTheme);
    return () => window.removeEventListener("toolfolio-theme", syncTheme);
  }, []);

  return (
    <img
      className="brand-mark"
      src={theme === "dark" ? "/branding/mark-dark.png" : "/branding/mark-light.png"}
      alt="Mikey's Favorites"
      width={42}
      height={42}
    />
  );
}
