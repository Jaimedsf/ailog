'use client';

import { useEffect, useState, createContext, useContext, ReactNode } from 'react';

const THEME_KEYS = ['dark', 'light', 'blue', 'green', 'purple', 'brown', 'gray'] as const;
type ThemeKey = typeof THEME_KEYS[number];

interface ThemeContextType {
  currentTheme: number;
  applyTheme: (index: number) => void;
  themeKeys: readonly string[];
}

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: 0,
  applyTheme: () => {},
  themeKeys: THEME_KEYS,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('seas-theme');
    if (saved) {
      const idx = parseInt(saved, 10);
      if (idx >= 0 && idx < THEME_KEYS.length) {
        applyTheme(idx);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyTheme = (i: number) => {
    setCurrentTheme(i);
    const key = THEME_KEYS[i];
    if (key === 'dark') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', key);
    }
    localStorage.setItem('seas-theme', String(i));
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, applyTheme, themeKeys: THEME_KEYS }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
