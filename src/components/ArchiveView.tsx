import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Calendar, Tag, MapPin, Grid, List, LayoutGrid } from 'lucide-react';
import { DiaryEntry } from '../types';
import { useThemeContext } from './ThemeProvider';
import { normalizeTimeString } from '../utils/timeUtils';
import { ArchiveEntryRenderers } from './ArchiveEntryRenderers';

interface ArchiveViewProps {
  entries: DiaryEntry[];
  onEdit?: (entry: DiaryEntry) => void;
}

interface ArchiveGroup {
  key: string;
  title: string;
  period: string;
  entries: DiaryEntry[];
  count: number;
}

type ArchiveDisplayMode = 'list' | 'cards' | 'compact' | 'timeline';
type ArchiveHeaderStyle = 'simple' | 'minimal' | 'timeline' | 'badge';

export function ArchiveView({ entries, onEdit }: ArchiveViewProps) {
  const { theme } = useThemeContext();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [displayMode, setDisplayMode] = useState<ArchiveDisplayMode>('cards');
  const [headerStyle, setHeaderStyle] = useState<ArchiveHeaderStyle>('simple');
  const [useNaturalTime, setUseNaturalTime] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // 获取渲染器
  const { renderCardEntry, renderCompactEntry, renderTimelineEntry } = ArchiveEntryRenderers();

  // 检测是否为移动设备
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 过滤掉隐藏的日记
  const visibleEntries = entries.filter(entry => !entry.hidden);

  // 获取自然语言时间表达
  const getNaturalTimeExpression = (date: Date, groupBy: 'year' | 'month' | 'week', key: string): string => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (groupBy === 'year') {
      const year = parseInt(key);
      if (year === currentYear) return '今年';
      if (year === currentYear - 1) return '去年';
      if (year === currentYear - 2) return '前年';
      return `${year}年`;
    }

    if (groupBy === 'month') {
      const [yearStr, monthStr] = key.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr) - 1; // 转为0-11

      if (year === currentYear && month === currentMonth) return '本月';
      if (year === currentYear && month === currentMonth - 1) return '上个月';
      if (year === currentYear - 1 && month === 11 && currentMonth === 0) return '上个月';

      // 今年的其他月份
      if (year === currentYear) {
        const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月',
                           '七月', '八月', '九月', '十月', '十一月', '十二月'];
        return monthNames[month];
      }

      // 其他年份
      return `${year}年${month + 1}月`;
    }

    if (groupBy === 'week') {
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay());

      const weekYear = startOfWeek.getFullYear();

      // 计算当前周
      const nowStartOfWeek = new Date(now);
      nowStartOfWeek.setDate(now.getDate() - now.getDay());

      const daysDiff = Math.floor((nowStartOfWeek.getTime() - startOfWeek.getTime()) / (24 * 60 * 60 * 1000));
      const weeksDiff = Math.floor(daysDiff / 7);

      if (weeksDiff === 0) return '本周';
      if (weeksDiff === 1) return '上周';
      if (weeksDiff === 2) return '上上周';
      if (weeksDiff >= 3 && weeksDiff <= 4) return '几周前';

      // 同年的其他周
      if (weekYear === currentYear) {
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
          const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月',
                             '七月', '八月', '九月', '十月', '十一月', '十二月'];
          return `${monthNames[startOfWeek.getMonth()]}第${Math.ceil(startOfWeek.getDate() / 7)}周`;
        } else {
          return `${startOfWeek.getMonth() + 1}月${startOfWeek.getDate()}日那周`;
        }
      }

      // 其他年份
      return `${weekYear}年${startOfWeek.getMonth() + 1}月第${Math.ceil(startOfWeek.getDate() / 7)}周`;
    }

    return key;
  };

  // 智能分组逻辑
  const createArchiveGroups = (): ArchiveGroup[] => {
    if (visibleEntries.length === 0) return [];

    // 按时间排序
    const sortedEntries = [...visibleEntries].sort((a, b) =>
      new Date(normalizeTimeString(b.created_at!)).getTime() -
      new Date(normalizeTimeString(a.created_at!)).getTime()
    );

    // 计算时间跨度
    const firstEntry = new Date(normalizeTimeString(sortedEntries[sortedEntries.length - 1].created_at!));
    const lastEntry = new Date(normalizeTimeString(sortedEntries[0].created_at!));
    const timeSpanDays = Math.ceil((lastEntry.getTime() - firstEntry.getTime()) / (1000 * 60 * 60 * 24));

    let groupBy: 'year' | 'month' | 'week';

    if (timeSpanDays >= 365) {
      groupBy = 'year';
    } else if (timeSpanDays >= 30) {
      groupBy = 'month';
    } else {
      groupBy = 'week';
    }

    const groups = new Map<string, DiaryEntry[]>();

    sortedEntries.forEach(entry => {
      const date = new Date(normalizeTimeString(entry.created_at!));
      let key: string;

      if (groupBy === 'year') {
        key = date.getFullYear().toString();
      } else if (groupBy === 'month') {
        key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      } else {
        // 按周分组
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());

        key = `${startOfWeek.getFullYear()}-W${Math.ceil((startOfWeek.getTime() - new Date(startOfWeek.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}`;
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(entry);
    });

    return Array.from(groups.entries()).map(([key, groupEntries]) => {
      const firstEntry = groupEntries[groupEntries.length - 1];
      const date = new Date(normalizeTimeString(firstEntry.created_at!));

      let groupTitle: string;
      let groupPeriod: string;

      if (useNaturalTime) {
        // 使用自然语言表达
        groupTitle = getNaturalTimeExpression(date, groupBy, key);
      } else {
        // 使用具体日期表达
        if (groupBy === 'year') {
          groupTitle = `${key}年`;
        } else if (groupBy === 'month') {
          groupTitle = `${date.getFullYear()}年${date.getMonth() + 1}月`;
        } else {
          const startOfWeek = new Date(date);
          startOfWeek.setDate(date.getDate() - date.getDay());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);

          groupTitle = `${startOfWeek.getMonth() + 1}月${startOfWeek.getDate()}日-${endOfWeek.getMonth() + 1}月${endOfWeek.getDate()}日`;
        }
      }

      if (groupBy === 'year') {
        groupPeriod = '年度';
      } else if (groupBy === 'month') {
        groupPeriod = '月度';
      } else {
        groupPeriod = '周度';
      }

      return {
        key,
        title: groupTitle,
        period: groupPeriod,
        entries: groupEntries,
        count: groupEntries.length
      };
    });
  };

  const archiveGroups = createArchiveGroups();

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const formatEntryDate = (dateString: string) => {
    const date = new Date(normalizeTimeString(dateString));
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const getMoodDisplay = (mood?: string) => {
    const moodEmojis: Record<string, string> = {
      happy: '😊',
      sad: '😢',
      neutral: '😐',
      excited: '🤩',
      anxious: '😰',
      peaceful: '😌'
    };
    return moodEmojis[mood || 'neutral'] || '😐';
  };

  const getWeatherDisplay = (weather?: string) => {
    const weatherEmojis: Record<string, string> = {
      sunny: '☀️',
      cloudy: '☁️',
      rainy: '🌧️',
      snowy: '❄️'
    };
    return weatherEmojis[weather || 'unknown'] || '';
  };

  // 渲染控制器
  const renderControls = () => (
    <div className="flex items-center justify-between mb-6">
      {/* 左侧控制 */}
      <div className="flex items-center gap-4">
        {/* 标题样式切换 */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: theme.colors.text }}>标题样式:</span>
          <select
            value={headerStyle}
            onChange={(e) => setHeaderStyle(e.target.value as ArchiveHeaderStyle)}
            className="px-2 py-1 rounded text-sm border"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            }}
          >
            <option value="simple">简洁</option>
            <option value="minimal">极简</option>
            <option value="timeline">时间轴</option>
            <option value="badge">标签</option>
          </select>
        </div>

        {/* 时间表达方式切换 */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useNaturalTime}
              onChange={(e) => setUseNaturalTime(e.target.checked)}
              style={{ accentColor: theme.colors.primary }}
            />
            <span className="text-sm" style={{ color: theme.colors.text }}>
              自然语言时间
            </span>
          </label>
        </div>
      </div>

      {/* 显示模式切换 */}
      <div className="flex items-center gap-1 p-1 rounded-lg"
           style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}>
        <button
          onClick={() => setDisplayMode('list')}
          className={`p-2 rounded-md transition-colors ${displayMode === 'list' ? 'shadow-sm' : ''}`}
          style={{
            backgroundColor: displayMode === 'list' ? theme.colors.primary : 'transparent',
            color: displayMode === 'list' ? 'white' : theme.colors.textSecondary,
          }}
          title="列表模式"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => setDisplayMode('cards')}
          className={`p-2 rounded-md transition-colors ${displayMode === 'cards' ? 'shadow-sm' : ''}`}
          style={{
            backgroundColor: displayMode === 'cards' ? theme.colors.primary : 'transparent',
            color: displayMode === 'cards' ? 'white' : theme.colors.textSecondary,
          }}
          title="卡片模式"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          onClick={() => setDisplayMode('compact')}
          className={`p-2 rounded-md transition-colors ${displayMode === 'compact' ? 'shadow-sm' : ''}`}
          style={{
            backgroundColor: displayMode === 'compact' ? theme.colors.primary : 'transparent',
            color: displayMode === 'compact' ? 'white' : theme.colors.textSecondary,
          }}
          title="紧凑模式"
        >
          <Grid className="w-4 h-4" />
        </button>
        <button
          onClick={() => setDisplayMode('timeline')}
          className={`p-2 rounded-md transition-colors ${displayMode === 'timeline' ? 'shadow-sm' : ''}`}
          style={{
            backgroundColor: displayMode === 'timeline' ? theme.colors.primary : 'transparent',
            color: displayMode === 'timeline' ? 'white' : theme.colors.textSecondary,
          }}
          title="时间线模式"
        >
          <Calendar className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  if (visibleEntries.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: theme.colors.textSecondary }} />
        <p className="text-lg" style={{ color: theme.colors.textSecondary }}>
          还没有日记记录
        </p>
      </div>
    );
  }

  // 渲染列表模式的日记条目
  const renderListEntry = (entry: DiaryEntry) => (
    <div
      key={entry.id}
      className="p-4 hover:bg-opacity-50 transition-colors cursor-pointer"
      onClick={() => onEdit?.(entry)}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div
            className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center ${isMobile ? 'text-xs' : 'text-sm'} font-medium`}
            style={{
              backgroundColor: theme.mode === 'glass'
                ? 'rgba(255, 255, 255, 0.1)'
                : `${theme.colors.primary}15`,
              color: theme.mode === 'glass' ? 'white' : theme.colors.primary
            }}
          >
            <span>{formatEntryDate(entry.created_at!)}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className={`${isMobile ? 'text-sm' : 'text-base'} font-medium truncate`}
                style={{ color: theme.mode === 'glass' ? 'white' : theme.colors.text }}>
              {entry.title || '无标题'}
            </h4>
            <div className="flex items-center gap-1">
              {entry.mood && entry.mood !== 'neutral' && (
                <span className="text-sm">{getMoodDisplay(entry.mood)}</span>
              )}
              {entry.weather && entry.weather !== 'unknown' && (
                <span className="text-sm">{getWeatherDisplay(entry.weather)}</span>
              )}
            </div>
          </div>
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} line-clamp-2 mb-2`}
             style={{ color: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.8)' : theme.colors.textSecondary }}>
            {entry.content.substring(0, 100)}...
          </p>
          <div className="flex items-center gap-4 text-xs">
            {entry.tags && entry.tags.length > 0 && (
              <div className="flex items-center gap-1">
                <Tag className="w-3 h-3" />
                <span style={{ color: theme.colors.textSecondary }}>
                  {entry.tags.slice(0, 2).map(tag => `#${tag}`).join(' ')}
                  {entry.tags.length > 2 && ` +${entry.tags.length - 2}`}
                </span>
              </div>
            )}
            {entry.location && entry.location.name && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span style={{ color: theme.colors.textSecondary }}>
                  {entry.location.name}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // 渲染不同样式的分组标题
  const renderGroupHeader = (group: ArchiveGroup) => {
    switch (headerStyle) {
      case 'minimal':
        return (
          <button
            onClick={() => toggleGroup(group.key)}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity mb-4"
          >
            {expandedGroups.has(group.key) ? (
              <ChevronDown className="w-4 h-4" style={{ color: theme.colors.primary }} />
            ) : (
              <ChevronRight className="w-4 h-4" style={{ color: theme.colors.primary }} />
            )}
            <span className={`${isMobile ? 'text-base' : 'text-lg'} font-medium`}
                  style={{ color: theme.mode === 'glass' ? 'white' : theme.colors.text }}>
              {group.title} ({group.count})
            </span>
          </button>
        );

      case 'timeline':
        return (
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: theme.colors.primary }}
              />
              <button
                onClick={() => toggleGroup(group.key)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                {expandedGroups.has(group.key) ? (
                  <ChevronDown className="w-4 h-4" style={{ color: theme.colors.primary }} />
                ) : (
                  <ChevronRight className="w-4 h-4" style={{ color: theme.colors.primary }} />
                )}
                <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold`}
                    style={{ color: theme.mode === 'glass' ? 'white' : theme.colors.text }}>
                  {group.title}
                </h3>
              </button>
            </div>
            <div className="flex-1 h-px"
                 style={{ backgroundColor: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.2)' : theme.colors.border }} />
            <span className="text-sm"
                  style={{ color: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.7)' : theme.colors.textSecondary }}>
              {group.count} 条
            </span>
          </div>
        );

      case 'badge':
        return (
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => toggleGroup(group.key)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              {expandedGroups.has(group.key) ? (
                <ChevronDown className="w-4 h-4" style={{ color: theme.colors.primary }} />
              ) : (
                <ChevronRight className="w-4 h-4" style={{ color: theme.colors.primary }} />
              )}
            </button>
            <div
              className="px-4 py-2 rounded-full flex items-center gap-2"
              style={{
                backgroundColor: `${theme.colors.primary}15`,
                border: `1px solid ${theme.colors.primary}30`
              }}
            >
              <Calendar className="w-4 h-4" style={{ color: theme.colors.primary }} />
              <span className={`${isMobile ? 'text-sm' : 'text-base'} font-medium`}
                    style={{ color: theme.colors.primary }}>
                {group.title}
              </span>
              <span className="text-xs px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: theme.colors.primary,
                      color: 'white'
                    }}>
                {group.count}
              </span>
            </div>
          </div>
        );

      default: // simple
        return (
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => toggleGroup(group.key)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              {expandedGroups.has(group.key) ? (
                <ChevronDown className="w-4 h-4" style={{ color: theme.colors.primary }} />
              ) : (
                <ChevronRight className="w-4 h-4" style={{ color: theme.colors.primary }} />
              )}
              <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold`}
                  style={{ color: theme.mode === 'glass' ? 'white' : theme.colors.text }}>
                {group.title}
              </h3>
            </button>

            <div className="flex-1 h-px"
                 style={{ backgroundColor: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.2)' : theme.colors.border }} />

            <div className="flex items-center gap-2 text-sm"
                 style={{ color: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.7)' : theme.colors.textSecondary }}>
              <Calendar className="w-4 h-4" />
              <span>{group.count} 条日记</span>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {renderControls()}
      {archiveGroups.map((group) => (
        <div key={group.key} className="space-y-4">
          {renderGroupHeader(group)}

          {/* 分组内容 */}
          {expandedGroups.has(group.key) && (
            <div className={`ml-6 ${displayMode === 'cards' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' :
                            displayMode === 'compact' ? 'space-y-1' :
                            displayMode === 'timeline' ? 'space-y-4' : 'divide-y'}`}
                 style={{ borderColor: displayMode === 'list' ? theme.colors.border : 'transparent' }}>
              {group.entries.map((entry) => {
                switch (displayMode) {
                  case 'cards':
                    return renderCardEntry({ entry, onEdit, isMobile });
                  case 'compact':
                    return renderCompactEntry({ entry, onEdit, isMobile });
                  case 'timeline':
                    return renderTimelineEntry({ entry, onEdit, isMobile });
                  default:
                    return renderListEntry(entry);
                }
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
