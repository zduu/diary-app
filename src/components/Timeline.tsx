
import { useState, useEffect } from 'react';
import { Clock, Calendar } from 'lucide-react';
import { DiaryEntry } from '../types';
import { DiaryCard } from './DiaryCard';
import { TimelineView } from './TimelineView';
import { getSmartTimeDisplay, formatTimelineDate, normalizeTimeString } from '../utils/timeUtils';
import { useThemeContext } from './ThemeProvider';
import { ViewMode } from './ViewModeToggle';

interface TimelineProps {
  entries: DiaryEntry[];
  onEdit?: (entry: DiaryEntry) => void;
  viewMode: ViewMode;
}

export function Timeline({ entries, onEdit, viewMode }: TimelineProps) {
  const { theme } = useThemeContext();
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

  // 过滤掉隐藏的日记（只有管理员可以看到）
  const visibleEntries = entries.filter(entry => !entry.hidden);

  // 如果是时间轴模式，直接使用TimelineView组件
  if (viewMode === 'timeline') {
    return <TimelineView entries={visibleEntries} onEdit={onEdit} />;
  }

  // 卡片模式的逻辑
  const groupedEntries = groupEntriesByDate(visibleEntries);

  // 创建带时间分隔的条目列表
  const createTimelineItems = () => {
    const items: Array<{ type: 'date' | 'entry' | 'time'; data: any; key: string }> = [];

    Object.entries(groupedEntries).forEach(([dateGroup, groupEntries], dateIndex) => {
      // 添加日期分隔符
      items.push({
        type: 'date',
        data: { dateGroup, isFirst: dateIndex === 0 },
        key: `date-${dateGroup}`
      });

      groupEntries.forEach((entry, entryIndex) => {
        // 添加时间分隔符（除了第一个条目）
        if (entryIndex > 0) {
          const timeDisplay = getSmartTimeDisplay(entry.created_at!);
          items.push({
            type: 'time',
            data: { timeDisplay, entry },
            key: `time-${entry.id}`
          });
        }

        // 添加日记条目
        items.push({
          type: 'entry',
          data: entry,
          key: `entry-${entry.id}`
        });
      });
    });

    return items;
  };

  const timelineItems = createTimelineItems();

  return (
    <div className={`${isMobile ? 'max-w-full' : 'max-w-4xl'} mx-auto`}>
      <div className="space-y-6">
        {timelineItems.map((item) => {
          if (item.type === 'date') {
            return (
              <div key={item.key} className={`${item.data.isFirst ? 'mt-0' : 'mt-8'} mb-6`}>
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center justify-center ${isMobile ? 'w-8 h-8' : 'w-10 h-10'} rounded-full`}
                    style={{
                      backgroundColor: theme.mode === 'glass'
                        ? 'rgba(255, 255, 255, 0.2)'
                        : `${theme.colors.primary}20`,
                      border: `2px solid ${theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.4)' : theme.colors.primary}`
                    }}
                  >
                    <Calendar className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`}
                      style={{ color: theme.mode === 'glass' ? 'white' : theme.colors.primary }} />
                  </div>
                  <div className="flex-1">
                    <h2
                      className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold`}
                      style={{
                        color: theme.mode === 'glass' ? 'white' : theme.colors.text,
                        textShadow: theme.mode === 'glass' ? '0 2px 4px rgba(0, 0, 0, 0.3)' : 'none'
                      }}
                    >
                      {item.data.dateGroup}
                    </h2>
                    <div
                      className="h-px mt-2 opacity-20"
                      style={{
                        backgroundColor: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.5)' : theme.colors.border
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          }

          if (item.type === 'time') {
            return (
              <div key={item.key} className="flex justify-center my-6">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isMobile ? 'text-xs' : 'text-sm'}`}
                  style={{
                    backgroundColor: theme.mode === 'glass'
                      ? 'rgba(255, 255, 255, 0.1)'
                      : theme.colors.surface,
                    border: `1px solid ${theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.2)' : theme.colors.border}`,
                    color: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.8)' : theme.colors.textSecondary
                  }}
                >
                  <Clock className="w-3 h-3" />
                  <span>{item.data.timeDisplay.relative}</span>
                </div>
              </div>
            );
          }

          if (item.type === 'entry') {
            return (
              <div key={item.key}>
                <DiaryCard
                  entry={item.data}
                  onEdit={onEdit}
                />
              </div>
            );
          }

          return null;
        })}
      </div>

      {visibleEntries.length === 0 && (
        <div className={`text-center ${isMobile ? 'py-12' : 'py-16'}`}>
          <div className={`${isMobile ? 'text-4xl' : 'text-6xl'} mb-4`}>📝</div>
          <h3
            className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold mb-2`}
            style={{
              color: theme.mode === 'glass' ? 'white' : theme.colors.text,
              textShadow: theme.mode === 'glass' ? '0 2px 4px rgba(0, 0, 0, 0.3)' : 'none'
            }}
          >
            开始你的日记之旅
          </h3>
          <p
            className={`${isMobile ? 'text-sm' : 'text-base'}`}
            style={{
              color: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.8)' : theme.colors.textSecondary,
              textShadow: theme.mode === 'glass' ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none'
            }}
          >
            记录生活中的美好时光，让回忆永远鲜活
          </p>
        </div>
      )}
    </div>
  );
}

function groupEntriesByDate(entries: DiaryEntry[]): Record<string, DiaryEntry[]> {
  const groups: Record<string, DiaryEntry[]> = {};

  entries.forEach((entry) => {
    if (!entry.created_at) return;

    const dateGroup = formatTimelineDate(entry.created_at);

    if (!groups[dateGroup]) {
      groups[dateGroup] = [];
    }
    groups[dateGroup].push(entry);
  });

  // Sort entries within each group by creation time (newest first)
  Object.keys(groups).forEach(key => {
    groups[key].sort((a, b) =>
      new Date(normalizeTimeString(b.created_at!)).getTime() - new Date(normalizeTimeString(a.created_at!)).getTime()
    );
  });

  return groups;
}


