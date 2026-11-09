"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { MdLightMode, MdDarkMode } from "react-icons/md";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="theme-toggle-button">
        <MdDarkMode className="theme-toggle-icon" />
      </div>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="theme-toggle-button"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <MdLightMode className="theme-toggle-icon" />
      ) : (
        <MdDarkMode className="theme-toggle-icon" />
      )}
    </button>
  );
}
