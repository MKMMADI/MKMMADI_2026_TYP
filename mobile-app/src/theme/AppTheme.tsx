import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { ColorPalette, darkColors, lightColors } from './tokens';

export type ThemeMode = 'light' | 'dark';

interface AppThemeValue {
  mode: ThemeMode;
  colors: ColorPalette;
  ready: boolean;
  toggleTheme: () => Promise<void>;
}

const THEME_KEY = 'bookspace-theme';
const AppThemeContext = createContext<AppThemeValue>({
  mode: 'dark',
  colors: darkColors,
  ready: true,
  toggleTheme: async () => {
    throw new Error('Theme changes require AppThemeProvider');
  },
});

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    SecureStore.getItemAsync(THEME_KEY)
      .then((savedMode) => {
        if (active && (savedMode === 'light' || savedMode === 'dark')) setMode(savedMode);
      })
      .catch((error: unknown) => {
        console.warn('Could not load saved theme preference', error);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const toggleTheme = useCallback(async () => {
    const nextMode: ThemeMode = mode === 'dark' ? 'light' : 'dark';
    await SecureStore.setItemAsync(THEME_KEY, nextMode);
    setMode(nextMode);
  }, [mode]);

  const value = useMemo<AppThemeValue>(() => ({
    mode,
    colors: mode === 'dark' ? darkColors : lightColors,
    ready,
    toggleTheme,
  }), [mode, ready, toggleTheme]);

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(AppThemeContext);
}
