import { useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark' | 'glass';

export interface ThemeConfig {
  mode: ThemeMode;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    accent: string;
  };
  effects: {
    blur: string;
    shadow: string;
    gradient: string;
  };
}

const themes: Record<ThemeMode, ThemeConfig> = {
  light: {
    mode: 'light',
    colors: {
      primary: '#3b82f6',
      secondary: '#64748b',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      textSecondary: '#64748b',
      border: '#e2e8f0',
      accent: '#06b6d4',
    },
    effects: {
      blur: 'backdrop-blur-sm',
      shadow: 'shadow-lg',
      gradient: 'bg-gradient-to-br from-blue-50 to-indigo-100',
    },
  },
  dark: {
    mode: 'dark',
    colors: {
      primary: '#60a5fa',
      secondary: '#94a3b8',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      textSecondary: '#94a3b8',
      border: '#334155',
      accent: '#22d3ee',
    },
    effects: {
      blur: 'backdrop-blur-sm',
      shadow: 'shadow-2xl shadow-black/50',
      gradient: 'bg-gradient-to-br from-slate-900 to-slate-800',
    },
  },
  glass: {
    mode: 'glass',
    colors: {
      primary: '#8b5cf6',
      secondary: '#a78bfa',
      background: 'transparent',
      surface: 'rgba(45, 27, 77, 0.75)',
      text: '#f8fafc',
      textSecondary: 'rgba(248, 250, 252, 0.85)',
      border: 'rgba(139, 92, 246, 0.4)',
      accent: '#c084fc',
    },
    effects: {
      blur: 'backdrop-blur-md',
      shadow: 'glass-shadow',
      gradient: 'glass-gradient',
    },
  },
};

export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('diary-theme');
      return (saved as ThemeMode) || 'light';
    }
    return 'light';
  });

  const theme = themes[currentTheme];

  const setTheme = (mode: ThemeMode) => {
    setCurrentTheme(mode);
    localStorage.setItem('diary-theme', mode);
    
    // 更新 CSS 变量
    const root = document.documentElement;
    const themeConfig = themes[mode];
    
    Object.entries(themeConfig.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    
    // 更新 body 类名
    document.body.className = `theme-${mode}`;
  };

  useEffect(() => {
    setTheme(currentTheme);
  }, [currentTheme]);

  const toggleTheme = () => {
    const modes: ThemeMode[] = ['light', 'dark', 'glass'];
    const currentIndex = modes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % modes.length;
    setTheme(modes[nextIndex]);
  };

  return {
    theme,
    currentTheme,
    setTheme,
    toggleTheme,
    themes,
  };
}
