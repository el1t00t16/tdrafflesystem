'use client';

import { useState, useEffect, useCallback } from 'react';

export type ColorMode = 'dark' | 'light';
export type ThemeId = 'royal-gold' | 'cyber-crimson' | 'emerald-gold' | 'editorial' | 'editorial-dark';

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  subtitle: string;
  tag: string;
  mode: ColorMode;
  isRecommended?: boolean;
  colors: {
    bg: string;
    surface: string;
    surfaceCard: string;
    accent: string;
    accentSecondary: string;
    text: string;
    textMuted: string;
    border: string;
  };
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'royal-gold',
    name: 'Royal DepEd & Imperial Gold',
    subtitle: 'Sovereign Midnight Navy & Radiant Fiesta Gold',
    tag: 'RECOMMENDED FOR STAGE',
    mode: 'dark',
    isRecommended: true,
    colors: {
      bg: '#080D1A',
      surface: '#0E172A',
      surfaceCard: '#131F38',
      accent: '#F59E0B',
      accentSecondary: '#E11D48',
      text: '#FFFFFF',
      textMuted: '#94A3B8',
      border: 'rgba(255, 255, 255, 0.15)'
    }
  },
  {
    id: 'cyber-crimson',
    name: 'Cyber Malungon Crimson',
    subtitle: 'Obsidian Titanium & High-Energy Neon Red',
    tag: 'HIGH VOLTAGE GAME SHOW',
    mode: 'dark',
    colors: {
      bg: '#070709',
      surface: '#101014',
      surfaceCard: '#18181F',
      accent: '#FF2A38',
      accentSecondary: '#F59E0B',
      text: '#FFFFFF',
      textMuted: '#A1A1AA',
      border: 'rgba(255, 255, 255, 0.15)'
    }
  },
  {
    id: 'emerald-gold',
    name: 'Sarangani Emerald & Sunburst',
    subtitle: 'Deep Evergreen Forest & Provincial Gold',
    tag: 'PROVINCIAL HERITAGE',
    mode: 'dark',
    colors: {
      bg: '#021A13',
      surface: '#062B20',
      surfaceCard: '#0C3D2F',
      accent: '#EAB308',
      accentSecondary: '#10B981',
      text: '#FFFFFF',
      textMuted: '#A7F3D0',
      border: 'rgba(255, 255, 255, 0.15)'
    }
  },
  {
    id: 'editorial',
    name: 'Editorial Ivory & Bauhaus Black',
    subtitle: 'Warm Alabaster Paper & Manila Tangerine',
    tag: 'MODERN RETRO CLASSIC',
    mode: 'light',
    colors: {
      bg: '#F8F7F4',
      surface: '#FFFFFF',
      surfaceCard: '#F8F7F4',
      accent: '#FF6A00',
      accentSecondary: '#1A1A1A',
      text: '#1A1A1A',
      textMuted: '#64748B',
      border: '#1A1A1A'
    }
  },
  {
    id: 'editorial-dark',
    name: 'Editorial Obsidian & Tangerine',
    subtitle: 'Bauhaus Obsidian Charcoal & Manila Tangerine',
    tag: 'RETRO MINIMALIST NIGHT',
    mode: 'dark',
    colors: {
      bg: '#0F1015',
      surface: '#17181F',
      surfaceCard: '#1E2029',
      accent: '#FF6A00',
      accentSecondary: '#F59E0B',
      text: '#FFFFFF',
      textMuted: '#94A3B8',
      border: 'rgba(255, 255, 255, 0.15)'
    }
  }
];

export const DEFAULT_THEME_ID: ThemeId = 'royal-gold';
export const THEME_STORAGE_KEY = 'td26_theme_preference';
export const LAST_DARK_THEME_KEY = 'td26_last_dark_theme';
export const LAST_LIGHT_THEME_KEY = 'td26_last_light_theme';

/**
 * Reads the active theme from localStorage or returns default.
 */
export function getSavedTheme(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID;
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId;
    if (saved && THEMES.some((t) => t.id === saved)) {
      return saved;
    }
  } catch (e) {
    console.warn('Failed to read theme from localStorage:', e);
  }
  return DEFAULT_THEME_ID;
}

/**
 * Applies the given theme id to document.documentElement and persists it.
 */
export function applyTheme(themeId: ThemeId): void {
  if (typeof document === 'undefined') return;
  const themeDef = THEMES.find((t) => t.id === themeId) || THEMES[0];
  const isDark = themeDef.mode === 'dark';

  document.documentElement.setAttribute('data-theme', themeId);
  document.documentElement.setAttribute('data-mode', isDark ? 'dark' : 'light');

  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
    if (isDark) {
      localStorage.setItem(LAST_DARK_THEME_KEY, themeId);
    } else {
      localStorage.setItem(LAST_LIGHT_THEME_KEY, themeId);
    }
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('td26_theme_change', { detail: themeId }));
  } catch (e) {
    console.warn('Failed to save theme to localStorage:', e);
  }
}

/**
 * Reactive React hook for theme reading and updating with live cross-component sync and Dark Mode toggle.
 */
export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(DEFAULT_THEME_ID);

  useEffect(() => {
    // Initial sync
    const initial = getSavedTheme();
    setCurrentTheme(initial);
    applyTheme(initial);

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<ThemeId>;
      if (customEvent.detail) {
        setCurrentTheme(customEvent.detail);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && e.newValue) {
        const newTheme = e.newValue as ThemeId;
        if (THEMES.some((t) => t.id === newTheme)) {
          setCurrentTheme(newTheme);
          applyTheme(newTheme);
        }
      }
    };

    window.addEventListener('td26_theme_change', handleThemeChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('td26_theme_change', handleThemeChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const changeTheme = useCallback((themeId: ThemeId) => {
    setCurrentTheme(themeId);
    applyTheme(themeId);
  }, []);

  const themeConfig = THEMES.find((t) => t.id === currentTheme) || THEMES[0];
  const isDark = themeConfig.mode === 'dark';

  const toggleDarkMode = useCallback(() => {
    if (isDark) {
      // Currently Dark: Switch to Light mode
      let targetLight: ThemeId = 'editorial';
      try {
        const savedLight = localStorage.getItem(LAST_LIGHT_THEME_KEY) as ThemeId;
        if (savedLight && THEMES.some((t) => t.id === savedLight && t.mode === 'light')) {
          targetLight = savedLight;
        }
      } catch (e) {}
      changeTheme(targetLight);
    } else {
      // Currently Light: Switch to Dark mode
      let targetDark: ThemeId = 'royal-gold';
      try {
        const savedDark = localStorage.getItem(LAST_DARK_THEME_KEY) as ThemeId;
        if (savedDark && THEMES.some((t) => t.id === savedDark && t.mode === 'dark')) {
          targetDark = savedDark;
        }
      } catch (e) {}
      changeTheme(targetDark);
    }
  }, [isDark, changeTheme]);

  const setMode = useCallback((mode: ColorMode) => {
    if (mode === 'dark' && !isDark) {
      toggleDarkMode();
    } else if (mode === 'light' && isDark) {
      toggleDarkMode();
    }
  }, [isDark, toggleDarkMode]);

  return {
    theme: currentTheme,
    themeConfig,
    allThemes: THEMES,
    setTheme: changeTheme,
    isDark,
    mode: themeConfig.mode,
    toggleDarkMode,
    setMode
  };
}
