import { useState, useEffect } from 'react';
import { Clock, Edit, Sun, Cloud, CloudRain, Snowflake } from 'lucide-react';
import { DiaryEntry, MoodType, WeatherType } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { getSmartTimeDisplay, formatLocalDate } from '../utils/timeUtils';
import { useThemeContext } from './ThemeProvider';
import { useAdminAuth } from './AdminPanel';
import { ImageViewer } from './ImageViewer';

interface TimelineViewProps {
  entries: DiaryEntry[];
  onEdit?: (entry: DiaryEntry) => void;
}

// 心情图标映射
const moodIcons: Record<MoodType, { icon: string; color: string }> = {
  happy: { icon: '😊', color: 'text-yellow-500' },
  sad: { icon: '😢', color: 'text-blue-500' },
  excited: { icon: '🤩', color: 'text-orange-500' },
  calm: { icon: '😌', color: 'text-green-500' },
  angry: { icon: '😠', color: 'text-red-500' },
  neutral: { icon: '😐', color: 'text-gray-500' },
  peaceful: { icon: '🕊️', color: 'text-blue-400' },
  grateful: { icon: '🙏', color: 'text-purple-500' },
  anxious: { icon: '😰', color: 'text-yellow-600' },
  loved: { icon: '🥰', color: 'text-pink-500' }
};

// 天气图标映射
const weatherIcons: Record<WeatherType, JSX.Element> = {
  sunny: <Sun className="w-4 h-4 text-yellow-500" />,
  cloudy: <Cloud className="w-4 h-4 text-gray-500" />,
  rainy: <CloudRain className="w-4 h-4 text-blue-500" />,
  snowy: <Snowflake className="w-4 h-4 text-blue-300" />,
  unknown: <Cloud className="w-4 h-4 text-gray-400" />
};

export function TimelineView({ entries, onEdit }: TimelineViewProps) {
  const { theme } = useThemeContext();
  const { isAdminAuthenticated } = useAdminAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // 检测是否为移动设备
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleImageClick = (images: string[], index: number) => {
    setSelectedImages(images);
    setSelectedImageIndex(index);
    setImageViewerOpen(true);
  };

  // 过滤掉隐藏的日记
  const visibleEntries = entries.filter(entry => !entry.hidden);

  if (visibleEntries.length === 0) {
    return (
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
    );
  }

  return (
    <div className="max-w-4xl mx-auto relative">
      {/* 主时间线 */}
      <div
        className={`absolute ${isMobile ? 'left-6' : 'left-8'} top-0 bottom-0 w-0.5`}
        style={{
          backgroundColor: theme.mode === 'glass'
            ? 'rgba(255, 255, 255, 0.3)'
            : `${theme.colors.primary}40`
        }}
      />

      <div className="space-y-12">
        {visibleEntries.map((entry, index) => {
          const timeDisplay = getSmartTimeDisplay(entry.created_at!);
          const mood = (entry.mood as MoodType) || 'neutral';
          const weather = (entry.weather as WeatherType) || 'unknown';

          return (
            <div key={entry.id} className="relative">
              {/* 时间节点 */}
              <div
                className={`absolute ${isMobile ? 'left-4' : 'left-6'} top-0 ${isMobile ? 'w-4 h-4' : 'w-6 h-6'} rounded-full border-2 z-10 shadow-lg`}
                style={{
                  backgroundColor: theme.mode === 'glass' ? '#c084fc' : theme.colors.surface,
                  borderColor: theme.mode === 'glass' ? '#a855f7' : theme.colors.primary,
                  boxShadow: theme.mode === 'glass'
                    ? '0 4px 8px rgba(192, 132, 252, 0.4)'
                    : `0 4px 8px ${theme.colors.primary}40`,
                }}
              />

              {/* 内容区域 */}
              <div
                className={`${isMobile ? 'ml-12' : 'ml-16'} pb-12 relative`}
                style={{
                  borderBottom: index < visibleEntries.length - 1
                    ? `1px solid ${theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.1)' : theme.colors.border}20`
                    : 'none'
                }}
              >
                {/* 时间信息 */}
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className={`flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-base'} font-medium`}
                    style={{
                      color: theme.mode === 'glass' ? 'white' : theme.colors.primary,
                      textShadow: theme.mode === 'glass' ? '0 2px 4px rgba(0, 0, 0, 0.3)' : 'none'
                    }}
                  >
                    <Clock className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                    <span>{timeDisplay.relative}</span>
                  </div>
                  
                  {/* 编辑按钮 */}
                  {onEdit && isAdminAuthenticated && (
                    <button
                      onClick={() => onEdit(entry)}
                      className="p-1.5 rounded-full transition-all duration-200 hover:scale-110 opacity-60 hover:opacity-100"
                      style={{
                        color: theme.colors.textSecondary,
                        backgroundColor: `${theme.colors.primary}10`
                      }}
                      title="编辑"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* 标题 */}
                {entry.title && entry.title !== '无标题' && (
                  <h3
                    className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold mb-3`}
                    style={{
                      color: theme.mode === 'glass' ? 'white' : theme.colors.text,
                      textShadow: theme.mode === 'glass' ? '0 2px 4px rgba(0, 0, 0, 0.3)' : 'none'
                    }}
                  >
                    {entry.title}
                    {entry.hidden && (
                      <span className="ml-2 text-xs px-2 py-1 rounded bg-red-500 text-white">
                        隐藏
                      </span>
                    )}
                  </h3>
                )}

                {/* 内容 */}
                <div className="mb-4">
                  {entry.content_type === 'markdown' ? (
                    <MarkdownRenderer content={entry.content} />
                  ) : (
                    <div
                      className={`leading-relaxed whitespace-pre-wrap ${isMobile ? 'text-sm' : 'text-base'}`}
                      style={{
                        color: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.9)' : theme.colors.text,
                        textShadow: theme.mode === 'glass' ? '0 1px 2px rgba(0, 0, 0, 0.2)' : 'none'
                      }}
                    >
                      {entry.content}
                    </div>
                  )}
                </div>

                {/* 图片 */}
                {entry.images && entry.images.length > 0 && (
                  <div className="mb-4">
                    <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
                      {entry.images.map((imageUrl, imgIndex) => (
                        <div
                          key={imgIndex}
                          className="relative group cursor-pointer"
                          onClick={() => handleImageClick(entry.images!, imgIndex)}
                        >
                          <img
                            src={imageUrl}
                            alt={`图片 ${imgIndex + 1}`}
                            className="w-full aspect-square object-cover rounded-lg transition-transform duration-200 group-hover:scale-105"
                            style={{ border: `1px solid ${theme.colors.border}` }}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                            <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-sm">
                              点击查看
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 标签 */}
                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {entry.tags.map((tag, tagIndex) => (
                      <span
                        key={tagIndex}
                        className={`px-2 py-1 rounded-full ${isMobile ? 'text-xs' : 'text-sm'}`}
                        style={{
                          backgroundColor: theme.mode === 'glass'
                            ? 'rgba(255, 255, 255, 0.25)'
                            : `${theme.colors.primary}20`,
                          color: theme.mode === 'glass'
                            ? '#ffffff'
                            : theme.colors.primary,
                          border: theme.mode === 'glass'
                            ? '1px solid rgba(255, 255, 255, 0.4)'
                            : `1px solid ${theme.colors.primary}40`,
                          backdropFilter: theme.mode === 'glass' ? 'blur(8px)' : 'none'
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* 心情、天气和具体日期 */}
                <div className={`flex items-center gap-4 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  <div className="flex items-center gap-1">
                    <span className={isMobile ? 'text-base' : 'text-lg'}>{moodIcons[mood].icon}</span>
                    <span style={{
                      color: theme.mode === 'glass'
                        ? 'rgba(255, 255, 255, 0.95)'
                        : theme.colors.primary,
                      fontWeight: '500'
                    }}>
                      {!isMobile && '心情'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {weatherIcons[weather]}
                    <span style={{
                      color: theme.mode === 'glass'
                        ? 'rgba(255, 255, 255, 0.8)'
                        : theme.colors.textSecondary
                    }}>
                      {!isMobile && '天气'}
                    </span>
                    <span
                      className="ml-2"
                      style={{
                        color: theme.mode === 'glass'
                          ? 'rgba(255, 255, 255, 0.8)'
                          : theme.colors.textSecondary
                      }}
                    >
                      {formatLocalDate(entry.created_at!)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 图片查看器 */}
      <ImageViewer
        images={selectedImages}
        initialIndex={selectedImageIndex}
        isOpen={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
      />
    </div>
  );
}
