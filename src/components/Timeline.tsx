import React from 'react';
import { Clock } from 'lucide-react';
import { DiaryEntry } from '../types';
import { DiaryCard } from './DiaryCard';
import { getSmartTimeDisplay, formatTimelineDate } from '../utils/timeUtils';
import { useThemeContext } from './ThemeProvider';

interface TimelineProps {
  entries: DiaryEntry[];
  onEdit?: (entry: DiaryEntry) => void;
  onDelete?: (id: number) => void;
}

export function Timeline({ entries, onEdit, onDelete }: TimelineProps) {
  const { theme } = useThemeContext();

  // 过滤掉隐藏的日记（只有管理员可以看到）
  const visibleEntries = entries.filter(entry => !entry.hidden);
  const groupedEntries = groupEntriesByDate(visibleEntries);

  return (
    <div className="max-w-5xl mx-auto relative">
      {/* 主时间线 */}
      <div
        className="absolute left-8 top-0 bottom-0 w-0.5 opacity-30"
        style={{
          backgroundColor: theme.mode === 'glass'
            ? 'rgba(255, 255, 255, 0.6)'
            : theme.colors.primary
        }}
      ></div>

      {Object.entries(groupedEntries).map(([dateGroup, groupEntries], groupIndex) => (
        <div key={dateGroup} className="relative mb-12">
          {/* 日期节点 */}
          <div className="flex items-center mb-8">
            <div
              className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full border-4 shadow-lg"
              style={{
                backgroundColor: theme.mode === 'glass' ? 'white' : theme.colors.surface,
                borderColor: theme.mode === 'glass' ? 'white' : theme.colors.primary,
                color: theme.mode === 'glass' ? theme.colors.primary : theme.colors.primary
              }}
            >
              <Clock className="w-6 h-6" />
            </div>
            <div className="ml-6 flex-1">
              <h2
                className="text-xl font-bold mb-1"
                style={{
                  color: theme.mode === 'glass' ? 'white' : theme.colors.text,
                  textShadow: theme.mode === 'glass' ? '0 2px 4px rgba(0, 0, 0, 0.3)' : 'none'
                }}
              >
                {dateGroup}
              </h2>
              <div
                className="h-px opacity-20"
                style={{
                  backgroundColor: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.5)' : theme.colors.border
                }}
              ></div>
            </div>
          </div>

          {/* 日记条目 */}
          <div className="ml-20 space-y-8">
            {groupEntries.map((entry, entryIndex) => {
              const timeDisplay = getSmartTimeDisplay(entry.created_at!);

              return (
                <div key={entry.id} className="relative">
                  {/* 时间线连接器 */}
                  <div
                    className="absolute -left-20 top-8 w-12 h-px opacity-30"
                    style={{
                      backgroundColor: theme.mode === 'glass'
                        ? 'rgba(255, 255, 255, 0.6)'
                        : theme.colors.primary
                    }}
                  ></div>

                  {/* 时间节点 */}
                  <div
                    className="absolute -left-12 top-6 w-4 h-4 rounded-full border-2 shadow-sm"
                    style={{
                      backgroundColor: theme.mode === 'glass' ? 'white' : theme.colors.surface,
                      borderColor: theme.mode === 'glass' ? 'white' : theme.colors.primary
                    }}
                  ></div>

                  {/* 时间标签 */}
                  <div className="absolute -left-32 top-6 text-right">
                    <div
                      className="text-sm font-medium"
                      style={{
                        color: theme.mode === 'glass' ? 'white' : theme.colors.primary,
                        textShadow: theme.mode === 'glass' ? '0 2px 4px rgba(0, 0, 0, 0.3)' : 'none'
                      }}
                      title={timeDisplay.tooltip}
                    >
                      {timeDisplay.relative}
                    </div>
                    <div
                      className="text-xs opacity-60"
                      style={{
                        color: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.8)' : theme.colors.textSecondary,
                        textShadow: theme.mode === 'glass' ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none'
                      }}
                    >
                      {timeDisplay.absolute}
                    </div>
                  </div>

                  {/* 日记卡片 */}
                  <DiaryCard
                    entry={entry}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {visibleEntries.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📝</div>
          <h3
            className="text-xl font-semibold mb-2"
            style={{
              color: theme.mode === 'glass' ? 'white' : theme.colors.text,
              textShadow: theme.mode === 'glass' ? '0 2px 4px rgba(0, 0, 0, 0.3)' : 'none'
            }}
          >
            开始你的日记之旅
          </h3>
          <p
            className="text-base"
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
      new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()
    );
  });

  return groups;
}


