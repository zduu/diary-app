import { Sun, Moon, Sparkles } from 'lucide-react';
import { useThemeContext } from './ThemeProvider';

const themeIcons = {
  light: Sun,
  dark: Moon,
  glass: Sparkles,
};

const themeNames = {
  light: '白天模式',
  dark: '夜间模式',
  glass: '玻璃模式',
};

export function ThemeToggle() {
  const { currentTheme, toggleTheme } = useThemeContext();
  const Icon = themeIcons[currentTheme];

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 md:p-2 rounded-full transition-all duration-300 hover:scale-110 group"
      style={{
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-primary)',
        border: '1px solid var(--color-border)',
      }}
      title={`当前: ${themeNames[currentTheme]} (点击切换)`}
    >
      <Icon className="w-4 h-4 md:w-5 md:h-5 transition-transform duration-300 group-hover:rotate-12" />

      {/* 主题指示器 */}
      <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 md:w-3 md:h-3 rounded-full border-2 border-white">
        {currentTheme === 'light' && (
          <div className="w-full h-full bg-yellow-400 rounded-full"></div>
        )}
        {currentTheme === 'dark' && (
          <div className="w-full h-full bg-slate-700 rounded-full"></div>
        )}
        {currentTheme === 'glass' && (
          <div className="w-full h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full"></div>
        )}
      </div>
    </button>
  );
}
