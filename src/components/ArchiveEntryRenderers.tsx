import { Tag, MapPin } from 'lucide-react';
import { DiaryEntry } from '../types';
import { useThemeContext } from './ThemeProvider';
import { normalizeTimeString } from '../utils/timeUtils';

interface ArchiveEntryRenderersProps {
  entry: DiaryEntry;
  onEdit?: (entry: DiaryEntry) => void;
  isMobile: boolean;
}

export function ArchiveEntryRenderers() {
  const { theme } = useThemeContext();

  const formatEntryDate = (dateString: string) => {
    const date = new Date(normalizeTimeString(dateString));
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const formatEntryTime = (dateString: string) => {
    const date = new Date(normalizeTimeString(dateString));
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
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

  // 卡片模式渲染
  const renderCardEntry = ({ entry, onEdit, isMobile }: ArchiveEntryRenderersProps) => (
    <div
      key={entry.id}
      className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${isMobile ? 'mb-3' : 'mb-4'}`}
      style={{
        backgroundColor: theme.mode === 'glass' 
          ? 'rgba(255, 255, 255, 0.05)' 
          : theme.colors.surface,
        borderColor: theme.mode === 'glass' 
          ? 'rgba(255, 255, 255, 0.1)' 
          : theme.colors.border,
        backdropFilter: theme.mode === 'glass' ? 'blur(5px)' : 'none'
      }}
      onClick={() => onEdit?.(entry)}
    >
      {/* 卡片头部 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="px-2 py-1 rounded text-xs font-medium"
            style={{
              backgroundColor: `${theme.colors.primary}20`,
              color: theme.colors.primary
            }}
          >
            {formatEntryDate(entry.created_at!)}
          </div>
          <span className="text-xs" style={{ color: theme.colors.textSecondary }}>
            {formatEntryTime(entry.created_at!)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {entry.mood && entry.mood !== 'neutral' && (
            <span className="text-lg">{getMoodDisplay(entry.mood)}</span>
          )}
          {entry.weather && entry.weather !== 'unknown' && (
            <span className="text-lg">{getWeatherDisplay(entry.weather)}</span>
          )}
        </div>
      </div>

      {/* 标题 */}
      <h4 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold mb-2 line-clamp-1`}
          style={{ color: theme.mode === 'glass' ? 'white' : theme.colors.text }}>
        {entry.title || '无标题'}
      </h4>

      {/* 内容预览 */}
      <p className={`${isMobile ? 'text-xs' : 'text-sm'} line-clamp-3 mb-3`}
         style={{ color: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.8)' : theme.colors.textSecondary }}>
        {entry.content}
      </p>

      {/* 底部信息 */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
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
  );

  // 紧凑模式渲染
  const renderCompactEntry = ({ entry, onEdit, isMobile }: ArchiveEntryRenderersProps) => (
    <div
      key={entry.id}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-opacity-50 transition-colors cursor-pointer"
      style={{
        backgroundColor: theme.mode === 'glass' 
          ? 'rgba(255, 255, 255, 0.02)' 
          : 'transparent'
      }}
      onClick={() => onEdit?.(entry)}
    >
      {/* 日期时间 */}
      <div className="flex-shrink-0 text-center">
        <div className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}
             style={{ color: theme.colors.primary }}>
          {formatEntryDate(entry.created_at!)}
        </div>
        <div className="text-xs" style={{ color: theme.colors.textSecondary }}>
          {formatEntryTime(entry.created_at!)}
        </div>
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium truncate`}
              style={{ color: theme.mode === 'glass' ? 'white' : theme.colors.text }}>
            {entry.title || '无标题'}
          </h4>
          <div className="flex items-center gap-1">
            {entry.mood && entry.mood !== 'neutral' && (
              <span className="text-xs">{getMoodDisplay(entry.mood)}</span>
            )}
            {entry.weather && entry.weather !== 'unknown' && (
              <span className="text-xs">{getWeatherDisplay(entry.weather)}</span>
            )}
          </div>
        </div>
        <p className="text-xs line-clamp-1" 
           style={{ color: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.6)' : theme.colors.textSecondary }}>
          {entry.content.substring(0, 60)}...
        </p>
      </div>

      {/* 标签 */}
      {entry.tags && entry.tags.length > 0 && (
        <div className="flex-shrink-0">
          <span className="text-xs px-2 py-1 rounded"
                style={{ 
                  backgroundColor: `${theme.colors.primary}15`,
                  color: theme.colors.primary 
                }}>
            #{entry.tags[0]}
            {entry.tags.length > 1 && ` +${entry.tags.length - 1}`}
          </span>
        </div>
      )}
    </div>
  );

  // 时间线模式渲染
  const renderTimelineEntry = ({ entry, onEdit, isMobile }: ArchiveEntryRenderersProps) => (
    <div key={entry.id} className="flex gap-4 pb-4">
      {/* 时间轴线 */}
      <div className="flex flex-col items-center">
        <div
          className="w-3 h-3 rounded-full border-2"
          style={{
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.primary
          }}
        />
        <div
          className="w-0.5 h-full mt-2"
          style={{ backgroundColor: `${theme.colors.primary}30` }}
        />
      </div>

      {/* 内容 */}
      <div
        className="flex-1 p-3 rounded-lg cursor-pointer transition-colors hover:bg-opacity-80"
        style={{
          backgroundColor: theme.mode === 'glass' 
            ? 'rgba(255, 255, 255, 0.05)' 
            : theme.colors.surface,
          border: `1px solid ${theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.1)' : theme.colors.border}`
        }}
        onClick={() => onEdit?.(entry)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}
                  style={{ color: theme.colors.primary }}>
              {formatEntryDate(entry.created_at!)} {formatEntryTime(entry.created_at!)}
            </span>
            <div className="flex items-center gap-1">
              {entry.mood && entry.mood !== 'neutral' && (
                <span className="text-sm">{getMoodDisplay(entry.mood)}</span>
              )}
              {entry.weather && entry.weather !== 'unknown' && (
                <span className="text-sm">{getWeatherDisplay(entry.weather)}</span>
              )}
            </div>
          </div>
        </div>

        <h4 className={`${isMobile ? 'text-sm' : 'text-base'} font-medium mb-2`}
            style={{ color: theme.mode === 'glass' ? 'white' : theme.colors.text }}>
          {entry.title || '无标题'}
        </h4>

        <p className={`${isMobile ? 'text-xs' : 'text-sm'} line-clamp-2 mb-2`}
           style={{ color: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.8)' : theme.colors.textSecondary }}>
          {entry.content}
        </p>

        <div className="flex items-center gap-4 text-xs">
          {entry.tags && entry.tags.length > 0 && (
            <div className="flex items-center gap-1">
              <Tag className="w-3 h-3" />
              <span style={{ color: theme.colors.textSecondary }}>
                {entry.tags.slice(0, 3).map(tag => `#${tag}`).join(' ')}
                {entry.tags.length > 3 && ` +${entry.tags.length - 3}`}
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
  );

  return {
    renderCardEntry,
    renderCompactEntry,
    renderTimelineEntry
  };
}
