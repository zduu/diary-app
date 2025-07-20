
import { LayoutGrid, List, Archive } from 'lucide-react';
import { useThemeContext } from './ThemeProvider';
import { useArchiveViewSettings } from '../hooks/useArchiveViewSettings';

export type ViewMode = 'card' | 'timeline' | 'archive';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps) {
  const { theme } = useThemeContext();
  const { settings: archiveViewSettings, loading: archiveViewLoading } = useArchiveViewSettings();

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg" 
         style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
      
      {/* 卡片模式 */}
      <button
        onClick={() => onViewModeChange('card')}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          viewMode === 'card' ? 'shadow-sm' : ''
        }`}
        style={{
          backgroundColor: viewMode === 'card' ? theme.colors.primary : 'transparent',
          color: viewMode === 'card' ? 'white' : theme.colors.textSecondary,
        }}
        title="卡片模式"
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="hidden sm:inline">卡片</span>
      </button>

      {/* 时间轴模式 */}
      <button
        onClick={() => onViewModeChange('timeline')}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          viewMode === 'timeline' ? 'shadow-sm' : ''
        }`}
        style={{
          backgroundColor: viewMode === 'timeline' ? theme.colors.primary : 'transparent',
          color: viewMode === 'timeline' ? 'white' : theme.colors.textSecondary,
        }}
        title="时间轴模式"
      >
        <List className="w-4 h-4" />
        <span className="hidden sm:inline">时间轴</span>
      </button>

      {/* 归纳模式 - 只在设置启用时显示 */}
      {!archiveViewLoading && archiveViewSettings.enabled && (
        <button
          onClick={() => onViewModeChange('archive')}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            viewMode === 'archive' ? 'shadow-sm' : ''
          }`}
          style={{
            backgroundColor: viewMode === 'archive' ? theme.colors.primary : 'transparent',
            color: viewMode === 'archive' ? 'white' : theme.colors.textSecondary,
          }}
          title="归纳模式"
        >
          <Archive className="w-4 h-4" />
          <span className="hidden sm:inline">归纳</span>
        </button>
      )}
    </div>
  );
}
