import { useState, useEffect } from 'react';
import { Search, X, Filter, Tag, Calendar } from 'lucide-react';
import { useThemeContext } from './ThemeProvider';
import { useAdminAuth } from './AdminPanel';
import { useQuickFiltersSettings } from '../hooks/useQuickFiltersSettings';
import { DiaryEntry } from '../types';
import { normalizeTimeString } from '../utils/timeUtils';

interface SearchBarProps {
  entries: DiaryEntry[];
  onSearchResults: (results: DiaryEntry[]) => void;
  onClearSearch: () => void;
}

export function SearchBar({ entries, onSearchResults, onClearSearch }: SearchBarProps) {
  const { theme } = useThemeContext();
  const { isAdminAuthenticated } = useAdminAuth();
  const { settings: quickFiltersSettings } = useQuickFiltersSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    searchInTitle: true,
    searchInContent: true,
    searchInTags: true,
    mood: '',
    weather: '',
    dateRange: '',
    selectedTag: '',
    selectedYear: '',
    selectedMonth: '',
  });

  // 执行搜索
  const performSearch = (query: string, filters: typeof searchFilters) => {
    if (!query.trim()) {
      onClearSearch();
      return;
    }

    const results = entries.filter(entry => {
      // 跳过隐藏的日记（普通用户看不到）
      if (entry.hidden) return false;

      const queryLower = query.toLowerCase();
      let matchesText = false;

      // 文本搜索
      if (filters.searchInTitle && entry.title?.toLowerCase().includes(queryLower)) {
        matchesText = true;
      }
      if (filters.searchInContent && entry.content.toLowerCase().includes(queryLower)) {
        matchesText = true;
      }
      if (filters.searchInTags && entry.tags?.some(tag => tag.toLowerCase().includes(queryLower))) {
        matchesText = true;
      }

      // 心情过滤
      if (filters.mood && entry.mood !== filters.mood) {
        return false;
      }

      // 天气过滤
      if (filters.weather && entry.weather !== filters.weather) {
        return false;
      }

      // 标签过滤
      if (filters.selectedTag) {
        if (filters.selectedTag === '__no_tags__') {
          // 筛选无标签的日记
          if (entry.tags && entry.tags.length > 0) {
            return false;
          }
        } else {
          // 筛选有特定标签的日记
          if (!entry.tags || !entry.tags.includes(filters.selectedTag)) {
            return false;
          }
        }
      }

      // 年份过滤
      if (filters.selectedYear) {
        const entryDate = new Date(normalizeTimeString(entry.created_at!));
        if (entryDate.getFullYear().toString() !== filters.selectedYear) {
          return false;
        }
      }

      // 月份过滤
      if (filters.selectedMonth) {
        const entryDate = new Date(normalizeTimeString(entry.created_at!));
        const entryMonth = (entryDate.getMonth() + 1).toString().padStart(2, '0');
        if (entryMonth !== filters.selectedMonth) {
          return false;
        }
      }

      // 日期范围过滤
      if (filters.dateRange) {
        const entryDate = new Date(normalizeTimeString(entry.created_at!));
        const now = new Date();

        switch (filters.dateRange) {
          case 'today':
            if (entryDate.toDateString() !== now.toDateString()) return false;
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (entryDate < weekAgo) return false;
            break;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (entryDate < monthAgo) return false;
            break;
        }
      }

      return matchesText;
    });

    onSearchResults(results);
  };

  // 监听搜索查询变化
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery, searchFilters);
    }, 300); // 防抖

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchFilters, entries]);

  const handleClearSearch = () => {
    setSearchQuery('');
    onClearSearch();
  };

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

  // 获取所有可用的年份
  const getAllYears = () => {
    const yearSet = new Set<string>();
    entries.forEach(entry => {
      if (!entry.hidden && entry.created_at) {
        const year = new Date(normalizeTimeString(entry.created_at)).getFullYear().toString();
        yearSet.add(year);
      }
    });
    return Array.from(yearSet).sort((a, b) => parseInt(b) - parseInt(a)); // 降序排列
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
    return Array.from(monthSet).sort((a, b) => parseInt(b) - parseInt(a)); // 降序排列
  };

  // 获取无标签日记的数量
  const getNoTagsCount = () => {
    return entries.filter(entry => !entry.hidden && (!entry.tags || entry.tags.length === 0)).length;
  };

  // 只有管理员认证后才显示搜索框
  if (!isAdminAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* 主搜索框 */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          <Search className="w-5 h-5" style={{ color: theme.colors.textSecondary }} />
        </div>
        
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索日记内容、标题、标签..."
          className="w-full pl-10 pr-20 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all"
          style={{
            backgroundColor: theme.mode === 'glass' 
              ? 'rgba(255, 255, 255, 0.1)' 
              : theme.colors.surface,
            borderColor: theme.mode === 'glass' 
              ? 'rgba(255, 255, 255, 0.3)' 
              : theme.colors.border,
            color: theme.mode === 'glass' ? 'white' : theme.colors.text,
            // focusRingColor: theme.colors.primary,
          }}
        />

        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="p-1 rounded-full hover:bg-opacity-80 transition-colors"
              style={{ backgroundColor: theme.colors.border }}
            >
              <X className="w-4 h-4" style={{ color: theme.colors.text }} />
            </button>
          )}
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1 rounded-full transition-colors ${showFilters ? 'bg-opacity-100' : 'hover:bg-opacity-80'}`}
            style={{ 
              backgroundColor: showFilters ? theme.colors.primary : theme.colors.border,
              color: showFilters ? 'white' : theme.colors.text
            }}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 高级过滤器 */}
      {showFilters && (
        <div 
          className="p-4 rounded-lg border space-y-4"
          style={{
            backgroundColor: theme.mode === 'glass' 
              ? 'rgba(255, 255, 255, 0.1)' 
              : theme.colors.surface,
            borderColor: theme.mode === 'glass' 
              ? 'rgba(255, 255, 255, 0.3)' 
              : theme.colors.border,
          }}
        >
          <h4 className="font-medium" style={{ color: theme.colors.text }}>
            搜索选项
          </h4>
          
          {/* 搜索范围 */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: theme.colors.text }}>
              搜索范围
            </label>
            <div className="flex flex-wrap gap-3">
              {[
                { key: 'searchInTitle', label: '标题' },
                { key: 'searchInContent', label: '内容' },
                { key: 'searchInTags', label: '标签' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={searchFilters[key as keyof typeof searchFilters] as boolean}
                    onChange={(e) => setSearchFilters(prev => ({
                      ...prev,
                      [key]: e.target.checked
                    }))}
                    className="rounded"
                    style={{ accentColor: theme.colors.primary }}
                  />
                  <span className="text-sm" style={{ color: theme.colors.text }}>
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 心情过滤 */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: theme.colors.text }}>
              心情
            </label>
            <select
              value={searchFilters.mood}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, mood: e.target.value }))}
              className="w-full px-3 py-2 rounded border"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              }}
            >
              <option value="">所有心情</option>
              <option value="happy">开心</option>
              <option value="sad">难过</option>
              <option value="neutral">平静</option>
              <option value="excited">兴奋</option>
              <option value="anxious">焦虑</option>
              <option value="peaceful">平和</option>
            </select>
          </div>

          {/* 天气过滤 */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: theme.colors.text }}>
              天气
            </label>
            <select
              value={searchFilters.weather}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, weather: e.target.value }))}
              className="w-full px-3 py-2 rounded border"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              }}
            >
              <option value="">所有天气</option>
              <option value="sunny">晴天</option>
              <option value="cloudy">多云</option>
              <option value="rainy">雨天</option>
              <option value="snowy">雪天</option>
            </select>
          </div>

          {/* 标签和时间过滤 - 只在快速筛选功能启用时显示 */}
          {quickFiltersSettings.enabled && (
            <>
              {/* 标签过滤 */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2" style={{ color: theme.colors.text }}>
                  <Tag className="w-4 h-4" />
                  按标签筛选
                </label>
                <select
                  value={searchFilters.selectedTag}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, selectedTag: e.target.value }))}
                  className="w-full px-3 py-2 rounded border"
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  }}
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
                <label className="text-sm font-medium flex items-center gap-2" style={{ color: theme.colors.text }}>
                  <Calendar className="w-4 h-4" />
                  按年份筛选
                </label>
                <select
                  value={searchFilters.selectedYear}
                  onChange={(e) => {
                    setSearchFilters(prev => ({
                      ...prev,
                      selectedYear: e.target.value,
                      selectedMonth: '' // 清空月份选择
                    }));
                  }}
                  className="w-full px-3 py-2 rounded border"
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  }}
                >
                  <option value="">所有年份</option>
                  {getAllYears().map(year => (
                    <option key={year} value={year}>{year}年</option>
                  ))}
                </select>
              </div>

              {/* 月份过滤 */}
              {searchFilters.selectedYear && (
                <div className="space-y-2">
                  <label className="text-sm font-medium" style={{ color: theme.colors.text }}>
                    按月份筛选
                  </label>
                  <select
                    value={searchFilters.selectedMonth}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, selectedMonth: e.target.value }))}
                    className="w-full px-3 py-2 rounded border"
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    }}
                  >
                    <option value="">所有月份</option>
                    {getMonthsForYear(searchFilters.selectedYear).map(month => (
                      <option key={month} value={month}>
                        {parseInt(month)}月
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {/* 日期范围 */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: theme.colors.text }}>
              时间范围
            </label>
            <select
              value={searchFilters.dateRange}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, dateRange: e.target.value }))}
              className="w-full px-3 py-2 rounded border"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              }}
            >
              <option value="">所有时间</option>
              <option value="today">今天</option>
              <option value="week">最近一周</option>
              <option value="month">最近一个月</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
