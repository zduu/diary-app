import { useState, useEffect } from 'react';
import { Tag, Calendar, X } from 'lucide-react';
import { useThemeContext } from './ThemeProvider';
import { useAdminAuth } from './AdminPanel';
import { useQuickFiltersSettings } from '../hooks/useQuickFiltersSettings';
import { DiaryEntry } from '../types';
import { normalizeTimeString } from '../utils/timeUtils';

interface QuickFiltersProps {
  entries: DiaryEntry[];
  onFilterResults: (results: DiaryEntry[]) => void;
  onClearFilter: () => void;
}

export function QuickFilters({ entries, onFilterResults, onClearFilter }: QuickFiltersProps) {
  const { theme } = useThemeContext();
  const { isAdminAuthenticated } = useAdminAuth();
  const { settings: quickFiltersSettings, loading: settingsLoading } = useQuickFiltersSettings();
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  // 检测是否为移动设备
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 获取所有可用的标签
  const getAllTags = () => {
    const tagSet = new Set<string>();
    entries.forEach(entry => {
      if (!entry.hidden && entry.tags) {
        entry.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  };

  // 获取无标签日记的数量
  const getNoTagsCount = () => {
    return entries.filter(entry => !entry.hidden && (!entry.tags || entry.tags.length === 0)).length;
  };

  // 获取所有可用的年份
  const getAllYears = () => {
    const yearSet = new Set<string>();
    entries.forEach(entry => {
      if (!entry.hidden && entry.created_at) {
        const year = new Date(normalizeTimeString(entry.created_at)).getFullYear().toString();
        yearSet.add(year);
      }
    });
    return Array.from(yearSet).sort((a, b) => parseInt(b) - parseInt(a));
  };

  // 获取指定年份的所有月份
  const getMonthsForYear = (year: string) => {
    const monthSet = new Set<string>();
    entries.forEach(entry => {
      if (!entry.hidden && entry.created_at) {
        const entryDate = new Date(normalizeTimeString(entry.created_at));
        if (entryDate.getFullYear().toString() === year) {
          const month = (entryDate.getMonth() + 1).toString().padStart(2, '0');
          monthSet.add(month);
        }
      }
    });
    return Array.from(monthSet).sort((a, b) => parseInt(b) - parseInt(a));
  };

  // 执行过滤
  const performFilter = (tag: string, year: string, month: string) => {
    if (!tag && !year && !month) {
      onClearFilter();
      return;
    }

    const results = entries.filter(entry => {
      // 跳过隐藏的日记
      if (entry.hidden) return false;

      // 标签过滤
      if (tag) {
        if (tag === '__no_tags__') {
          // 筛选无标签的日记
          if (entry.tags && entry.tags.length > 0) {
            return false;
          }
        } else {
          // 筛选有特定标签的日记
          if (!entry.tags || !entry.tags.includes(tag)) {
            return false;
          }
        }
      }

      // 年份过滤
      if (year) {
        const entryDate = new Date(normalizeTimeString(entry.created_at!));
        if (entryDate.getFullYear().toString() !== year) {
          return false;
        }
      }

      // 月份过滤
      if (month) {
        const entryDate = new Date(normalizeTimeString(entry.created_at!));
        const entryMonth = (entryDate.getMonth() + 1).toString().padStart(2, '0');
        if (entryMonth !== month) {
          return false;
        }
      }

      return true;
    });

    onFilterResults(results);
  };

  // 监听过滤条件变化
  useEffect(() => {
    performFilter(selectedTag, selectedYear, selectedMonth);
  }, [selectedTag, selectedYear, selectedMonth, entries]);

  // 清除所有过滤
  const handleClearAll = () => {
    setSelectedTag('');
    setSelectedYear('');
    setSelectedMonth('');
    onClearFilter();
  };

  // 只有管理员认证后且设置启用时才显示
  if (!isAdminAuthenticated || settingsLoading || !quickFiltersSettings.enabled) {
    return null;
  }

  const hasActiveFilters = selectedTag || selectedYear || selectedMonth;

  return (
    <div className="space-y-4">
      {/* 快速过滤标题 */}
      <div className="flex items-center justify-between">
        <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-medium`} style={{ color: theme.colors.text }}>
          快速筛选
        </h3>
        {hasActiveFilters && (
          <button
            onClick={handleClearAll}
            className={`flex items-center gap-1 ${isMobile ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1'} rounded-full transition-colors`}
            style={{
              backgroundColor: `${theme.colors.accent}20`,
              color: theme.colors.accent,
              border: `1px solid ${theme.colors.accent}40`
            }}
          >
            <X className="w-3 h-3" />
            清除筛选
          </button>
        )}
      </div>

      {/* 过滤选项 */}
      <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-3 gap-4'}`}>
        {/* 标签过滤 */}
        <div className="space-y-2">
          <label className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium flex items-center gap-2`} style={{ color: theme.colors.text }}>
            <Tag className="w-4 h-4" />
            标签
          </label>
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className={`w-full ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'} rounded border focus:outline-none focus:ring-2 transition-all`}
            style={{
              backgroundColor: theme.mode === 'glass' 
                ? 'rgba(255, 255, 255, 0.1)' 
                : theme.colors.surface,
              borderColor: theme.mode === 'glass' 
                ? 'rgba(255, 255, 255, 0.3)' 
                : theme.colors.border,
              color: theme.mode === 'glass' ? 'white' : theme.colors.text,
              '--tw-ring-color': theme.colors.primary,
            } as React.CSSProperties}
          >
            <option value="">所有标签</option>
            <option value="__no_tags__">📝 无标签 ({getNoTagsCount()})</option>
            {getAllTags().map(tag => (
              <option key={tag} value={tag}>#{tag}</option>
            ))}
          </select>
        </div>

        {/* 年份过滤 */}
        <div className="space-y-2">
          <label className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium flex items-center gap-2`} style={{ color: theme.colors.text }}>
            <Calendar className="w-4 h-4" />
            年份
          </label>
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setSelectedMonth(''); // 清空月份选择
            }}
            className={`w-full ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'} rounded border focus:outline-none focus:ring-2 transition-all`}
            style={{
              backgroundColor: theme.mode === 'glass' 
                ? 'rgba(255, 255, 255, 0.1)' 
                : theme.colors.surface,
              borderColor: theme.mode === 'glass' 
                ? 'rgba(255, 255, 255, 0.3)' 
                : theme.colors.border,
              color: theme.mode === 'glass' ? 'white' : theme.colors.text,
              '--tw-ring-color': theme.colors.primary,
            } as React.CSSProperties}
          >
            <option value="">所有年份</option>
            {getAllYears().map(year => (
              <option key={year} value={year}>{year}年</option>
            ))}
          </select>
        </div>

        {/* 月份过滤 */}
        <div className="space-y-2">
          <label className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`} style={{ color: theme.colors.text }}>
            月份
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            disabled={!selectedYear}
            className={`w-full ${isMobile ? 'px-2 py-1.5 text-sm' : 'px-3 py-2'} rounded border focus:outline-none focus:ring-2 transition-all ${!selectedYear ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{
              backgroundColor: theme.mode === 'glass' 
                ? 'rgba(255, 255, 255, 0.1)' 
                : theme.colors.surface,
              borderColor: theme.mode === 'glass' 
                ? 'rgba(255, 255, 255, 0.3)' 
                : theme.colors.border,
              color: theme.mode === 'glass' ? 'white' : theme.colors.text,
              '--tw-ring-color': theme.colors.primary,
            } as React.CSSProperties}
          >
            <option value="">{selectedYear ? '所有月份' : '请先选择年份'}</option>
            {selectedYear && getMonthsForYear(selectedYear).map(month => (
              <option key={month} value={month}>
                {parseInt(month)}月
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 活跃过滤器显示 */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {selectedTag && (
            <span
              className={`flex items-center gap-1 ${isMobile ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1'} rounded-full`}
              style={{
                backgroundColor: `${theme.colors.primary}20`,
                color: theme.colors.primary,
                border: `1px solid ${theme.colors.primary}40`
              }}
            >
              <Tag className="w-3 h-3" />
              {selectedTag === '__no_tags__' ? '📝 无标签' : `#${selectedTag}`}
              <button
                onClick={() => setSelectedTag('')}
                className="hover:opacity-80 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedYear && (
            <span
              className={`flex items-center gap-1 ${isMobile ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1'} rounded-full`}
              style={{
                backgroundColor: `${theme.colors.primary}20`,
                color: theme.colors.primary,
                border: `1px solid ${theme.colors.primary}40`
              }}
            >
              <Calendar className="w-3 h-3" />
              {selectedYear}年{selectedMonth && `${parseInt(selectedMonth)}月`}
              <button
                onClick={() => {
                  setSelectedYear('');
                  setSelectedMonth('');
                }}
                className="hover:opacity-80 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
