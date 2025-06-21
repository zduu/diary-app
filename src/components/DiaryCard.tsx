import React from 'react';
import { Calendar, Heart, Cloud, Sun, CloudRain, Snowflake, Edit, Trash2, Image as ImageIcon } from 'lucide-react';
import { DiaryEntry, MoodType, WeatherType } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { getSmartTimeDisplay } from '../utils/timeUtils';
import { useThemeContext } from './ThemeProvider';

interface DiaryCardProps {
  entry: DiaryEntry;
  onEdit?: (entry: DiaryEntry) => void;
  onDelete?: (id: number) => void;
}

const moodIcons: Record<MoodType, { icon: React.ReactNode; color: string }> = {
  happy: { icon: '😊', color: 'text-yellow-500' },
  sad: { icon: '😢', color: 'text-blue-500' },
  neutral: { icon: '😐', color: 'text-gray-500' },
  excited: { icon: '🤩', color: 'text-orange-500' },
  anxious: { icon: '😰', color: 'text-red-500' },
  peaceful: { icon: '😌', color: 'text-green-500' },
};

const weatherIcons: Record<WeatherType, React.ReactNode> = {
  sunny: <Sun className="w-4 h-4 text-yellow-500" />,
  cloudy: <Cloud className="w-4 h-4 text-gray-500" />,
  rainy: <CloudRain className="w-4 h-4 text-blue-500" />,
  snowy: <Snowflake className="w-4 h-4 text-blue-300" />,
  unknown: <Cloud className="w-4 h-4 text-gray-400" />,
};

export function DiaryCard({ entry, onEdit, onDelete }: DiaryCardProps) {
  const { theme } = useThemeContext();
  const mood = (entry.mood as MoodType) || 'neutral';
  const weather = (entry.weather as WeatherType) || 'unknown';
  const timeDisplay = getSmartTimeDisplay(entry.created_at!);

  return (
    <div
      className={`rounded-xl p-6 transition-all duration-300 hover:scale-[1.02] ${theme.effects.blur} ${theme.effects.shadow}`}
      style={{
        backgroundColor: theme.mode === 'glass' ? undefined : theme.colors.surface,
        border: theme.mode === 'glass' ? undefined : `1px solid ${theme.colors.border}`,
      }}
    >
      {/* Header - Only show if title exists and is not default */}
      {entry.title && entry.title !== '无标题' && (
        <div className="flex justify-between items-start mb-4">
          <h3
            className="text-xl font-bold flex-1"
            style={{
              color: theme.colors.text,
              textShadow: theme.mode === 'glass' ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none'
            }}
          >
            {entry.title}
            {entry.hidden && (
              <span className="ml-2 text-xs px-2 py-1 rounded bg-red-500 text-white">
                隐藏
              </span>
            )}
          </h3>
          <div className="flex gap-2 ml-4">
            {onEdit && (
              <button
                onClick={() => onEdit(entry)}
                className="p-2 rounded-full transition-all duration-200 hover:scale-110"
                style={{
                  color: theme.colors.textSecondary,
                  backgroundColor: `${theme.colors.primary}20`
                }}
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {onDelete && entry.id && (
              <button
                onClick={() => onDelete(entry.id!)}
                className="p-2 rounded-full transition-all duration-200 hover:scale-110 hover:bg-red-100"
                style={{ color: theme.colors.textSecondary }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Action buttons for entries without title */}
      {(!entry.title || entry.title === '无标题') && (
        <div className="flex justify-end gap-2 mb-4">
          {onEdit && (
            <button
              onClick={() => onEdit(entry)}
              className="p-2 rounded-full transition-all duration-200 hover:scale-110"
              style={{
                color: theme.colors.textSecondary,
                backgroundColor: `${theme.colors.primary}20`
              }}
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
          {onDelete && entry.id && (
            <button
              onClick={() => onDelete(entry.id!)}
              className="p-2 rounded-full transition-all duration-200 hover:scale-110 hover:bg-red-100"
              style={{ color: theme.colors.textSecondary }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="mb-4">
        {entry.content_type === 'markdown' ? (
          <MarkdownRenderer content={entry.content} />
        ) : (
          <p
            className="leading-relaxed"
            style={{
              color: theme.colors.text,
              textShadow: theme.mode === 'glass' ? '0 1px 2px rgba(0, 0, 0, 0.2)' : 'none'
            }}
          >
            {entry.content}
          </p>
        )}
      </div>

      {/* Images */}
      {entry.images && entry.images.length > 0 && (
        <div className="mb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {entry.images.map((imageUrl, index) => (
              <div key={index} className="relative group">
                <img
                  src={imageUrl}
                  alt={`图片 ${index + 1}`}
                  className="w-full aspect-square object-cover rounded-lg transition-transform duration-200 group-hover:scale-105"
                  style={{ border: `1px solid ${theme.colors.border}` }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {entry.tags && entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {entry.tags.map((tag, index) => (
            <span
              key={index}
              className="px-3 py-1 text-sm rounded-full transition-colors duration-200"
              style={{
                backgroundColor: `${theme.colors.primary}20`,
                color: theme.colors.primary,
                border: `1px solid ${theme.colors.primary}40`
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-1"
            style={{ color: theme.colors.textSecondary }}
            title={timeDisplay.tooltip}
          >
            <Calendar className="w-4 h-4" />
            <span>{timeDisplay.relative}</span>
          </div>

          <div
            className="flex items-center gap-1"
            style={{ color: theme.colors.textSecondary }}
          >
            <span className="text-lg">{moodIcons[mood].icon}</span>
            <span className={moodIcons[mood].color}>心情</span>
          </div>

          <div
            className="flex items-center gap-1"
            style={{ color: theme.colors.textSecondary }}
          >
            {weatherIcons[weather]}
            <span>天气</span>
          </div>
        </div>
      </div>
    </div>
  );
}
