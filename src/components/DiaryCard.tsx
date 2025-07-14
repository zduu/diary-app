import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Cloud, Sun, CloudRain, Snowflake, Edit, Image as ImageIcon, MoreHorizontal, ChevronDown, ChevronUp, MapPin, X } from 'lucide-react';
import { DiaryEntry, MoodType, WeatherType } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { getSmartTimeDisplay, formatFullDateTime } from '../utils/timeUtils';
import { useThemeContext } from './ThemeProvider';
import { useAdminAuth } from './AdminPanel';
import { ImageViewer } from './ImageViewer';

interface DiaryCardProps {
  entry: DiaryEntry;
  onEdit?: (entry: DiaryEntry) => void;
  // 移除onDelete，删除功能移到管理员面板
}

const moodIcons: Record<MoodType, { icon: React.ReactNode; color: string }> = {
  happy: { icon: '😊', color: 'text-yellow-500' },
  sad: { icon: '😢', color: 'text-blue-500' },
  neutral: { icon: '😐', color: 'text-gray-500' },
  excited: { icon: '🤩', color: 'text-orange-500' },
  anxious: { icon: '😰', color: 'text-red-500' },
  peaceful: { icon: '😌', color: 'text-green-500' },
  calm: { icon: '😌', color: 'text-green-500' },
  angry: { icon: '😠', color: 'text-red-500' },
  grateful: { icon: '🙏', color: 'text-purple-500' },
  loved: { icon: '🥰', color: 'text-pink-500' }
};

const weatherIcons: Record<WeatherType, React.ReactNode> = {
  sunny: <Sun className="w-4 h-4 text-yellow-500" />,
  cloudy: <Cloud className="w-4 h-4 text-gray-500" />,
  rainy: <CloudRain className="w-4 h-4 text-blue-500" />,
  snowy: <Snowflake className="w-4 h-4 text-blue-300" />,
  unknown: <Cloud className="w-4 h-4 text-gray-400" />,
};

// 获取心情显示信息
const getMoodDisplay = (mood: string) => {
  const predefinedMood = moodIcons[mood as MoodType];
  if (predefinedMood) {
    return predefinedMood;
  }
  // 自定义心情使用默认图标
  return { icon: '💭', color: 'text-purple-500' };
};

// 获取天气显示信息
const getWeatherDisplay = (weather: string) => {
  const predefinedWeather = weatherIcons[weather as WeatherType];
  if (predefinedWeather) {
    return predefinedWeather;
  }
  // 自定义天气使用默认图标
  return <Cloud className="w-4 h-4 text-gray-500" />;
};

export function DiaryCard({ entry, onEdit }: DiaryCardProps) {
  const { theme } = useThemeContext();
  const { isAdminAuthenticated } = useAdminAuth();
  const [showDetails, setShowDetails] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [locationDetailOpen, setLocationDetailOpen] = useState(false);

  const mood = entry.mood || 'neutral';
  const weather = entry.weather || 'unknown';
  const timeDisplay = getSmartTimeDisplay(entry.created_at!);
  const moodDisplay = getMoodDisplay(mood);
  const weatherDisplay = getWeatherDisplay(weather);

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setImageViewerOpen(true);
  };



  // 检测是否为移动设备
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div
      className={`rounded-xl transition-all duration-300 hover:scale-[1.02] ${theme.effects.blur} ${theme.effects.shadow} ${
        isMobile ? 'p-4 mb-6' : 'p-6 mb-8'
      } relative`}
      style={{
        backgroundColor: theme.mode === 'glass' ? undefined : theme.colors.surface,
        border: theme.mode === 'glass' ? undefined : `1px solid ${theme.colors.border}`,
        boxShadow: theme.mode === 'glass'
          ? undefined
          : `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`,
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        {/* Title or first line of content */}
        <div className="flex-1 min-w-0">
          {entry.title && entry.title !== '无标题' ? (
            <h3
              className={`font-bold flex-1 ${isMobile ? 'text-lg' : 'text-xl'}`}
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
          ) : (
            <div
              className={`font-medium ${isMobile ? 'text-base' : 'text-lg'} line-clamp-2`}
              style={{
                color: theme.colors.text,
                textShadow: theme.mode === 'glass' ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none'
              }}
            >
              {entry.content.split('\n')[0].substring(0, isMobile ? 50 : 80)}
              {entry.content.length > (isMobile ? 50 : 80) && '...'}
            </div>
          )}
        </div>

        {/* Action buttons - 移动端折叠 */}
        <div className="flex items-center gap-2 ml-4">
          {isMobile ? (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-2 rounded-full transition-all duration-200 hover:scale-110"
              style={{
                color: theme.colors.textSecondary,
                backgroundColor: `${theme.colors.primary}20`
              }}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          ) : (
            onEdit && isAdminAuthenticated && (
              <button
                onClick={() => onEdit(entry)}
                className="p-2 rounded-full transition-all duration-200 hover:scale-110"
                style={{
                  color: theme.colors.textSecondary,
                  backgroundColor: `${theme.colors.primary}20`
                }}
                title="编辑"
              >
                <Edit className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Mobile action panel */}
      {isMobile && showDetails && (
        <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: `${theme.colors.primary}10` }}>
          <div className="flex justify-between items-center">
            <span className="text-sm" style={{ color: theme.colors.textSecondary }}>
              操作
            </span>
            <div className="flex gap-2">
              {onEdit && isAdminAuthenticated && (
                <button
                  onClick={() => {
                    onEdit(entry);
                    setShowDetails(false);
                  }}
                  className="px-3 py-1 rounded-full text-sm transition-all duration-200"
                  style={{
                    color: theme.colors.primary,
                    backgroundColor: `${theme.colors.primary}20`
                  }}
                >
                  编辑
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="mb-4">
        {isMobile && !showDetails ? (
          // 移动端简化显示
          <div
            className={`leading-relaxed ${entry.title && entry.title !== '无标题' ? '' : 'mt-2'}`}
            style={{
              color: theme.colors.text,
              textShadow: theme.mode === 'glass' ? '0 1px 2px rgba(0, 0, 0, 0.2)' : 'none'
            }}
          >
            {entry.content.split('\n').slice(0, 3).map((line, index) => (
              <p key={index} className="mb-1">
                {line.length > 60 ? line.substring(0, 60) + '...' : line}
              </p>
            ))}
            {entry.content.split('\n').length > 3 && (
              <button
                onClick={() => setShowDetails(true)}
                className="text-sm mt-2 flex items-center gap-1 transition-colors"
                style={{ color: theme.colors.primary }}
              >
                <span>展开全文</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          // 桌面端或展开状态完整显示
          <div>
            {entry.content_type === 'markdown' ? (
              <MarkdownRenderer content={entry.content} />
            ) : (
              <p
                className="leading-relaxed whitespace-pre-wrap"
                style={{
                  color: theme.colors.text,
                  textShadow: theme.mode === 'glass' ? '0 1px 2px rgba(0, 0, 0, 0.2)' : 'none'
                }}
              >
                {entry.content}
              </p>
            )}
            {isMobile && showDetails && (
              <button
                onClick={() => setShowDetails(false)}
                className="text-sm mt-2 flex items-center gap-1 transition-colors"
                style={{ color: theme.colors.primary }}
              >
                <span>收起</span>
                <ChevronUp className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Images - 移动端折叠显示 */}
      {entry.images && entry.images.length > 0 && (isMobile ? showDetails : true) && (
        <div className="mb-4">
          <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
            {entry.images.slice(0, isMobile && !showDetails ? 2 : undefined).map((imageUrl, index) => (
              <div key={index} className="relative group cursor-pointer" onClick={() => handleImageClick(index)}>
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
          {isMobile && !showDetails && entry.images.length > 2 && (
            <div className="text-center mt-2">
              <button
                onClick={() => setShowDetails(true)}
                className="text-sm"
                style={{ color: theme.colors.primary }}
              >
                查看全部 {entry.images.length} 张图片
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tags - 移动端简化显示 */}
      {entry.tags && entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {(isMobile && !showDetails ? entry.tags.slice(0, 3) : entry.tags).map((tag, index) => (
            <span
              key={index}
              className={`px-3 py-1 rounded-full transition-colors duration-200 ${isMobile ? 'text-xs' : 'text-sm'}`}
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
          {isMobile && !showDetails && entry.tags.length > 3 && (
            <button
              onClick={() => setShowDetails(true)}
              className="px-3 py-1 text-xs rounded-full transition-colors duration-200"
              style={{
                backgroundColor: `${theme.colors.textSecondary}20`,
                color: theme.colors.textSecondary
              }}
            >
              +{entry.tags.length - 3}
            </button>
          )}
        </div>
      )}

      {/* Footer - 移动端简化显示 */}
      <div className={`flex justify-between items-center ${isMobile ? 'text-xs' : 'text-sm'}`}>
        <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-4'}`}>
          {/* 移动端显示心情、天气和具体日期 */}
          {isMobile ? (
            <>
              <div className="flex items-center gap-1">
                <span className="text-base">{moodDisplay.icon}</span>
              </div>
              <div className="flex items-center gap-1">
                {weatherDisplay}
              </div>
              {entry.location && (
                <div
                  className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setLocationDetailOpen(true)}
                  title="点击查看详细位置信息"
                >
                  <MapPin className="w-3 h-3" style={{
                    color: theme.mode === 'glass'
                      ? 'rgba(255, 255, 255, 0.8)'
                      : theme.colors.textSecondary
                  }} />
                  <span style={{
                    color: theme.mode === 'glass'
                      ? 'rgba(255, 255, 255, 0.9)'
                      : theme.colors.textSecondary
                  }}>
                    {entry.location.name || '位置'}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <span style={{
                  color: theme.mode === 'glass'
                    ? 'rgba(255, 255, 255, 0.9)'
                    : theme.colors.textSecondary
                }}>
                  {formatFullDateTime(entry.created_at!)}
                </span>
              </div>
            </>
          ) : (
            <>
              <div
                className="flex items-center gap-1"
                style={{
                  color: theme.mode === 'glass'
                    ? 'rgba(255, 255, 255, 0.8)'
                    : theme.colors.textSecondary
                }}
                title={timeDisplay.tooltip}
              >
                <Calendar className="w-4 h-4" />
                <span>{timeDisplay.relative}</span>
              </div>

              <div
                className="flex items-center gap-1"
                style={{
                  color: theme.mode === 'glass'
                    ? 'rgba(255, 255, 255, 0.95)'
                    : theme.colors.primary
                }}
              >
                <span className="text-lg">{moodDisplay.icon}</span>
                <span className="font-medium">心情: {mood}</span>
              </div>

              <div
                className="flex items-center gap-1"
                style={{
                  color: theme.mode === 'glass'
                    ? 'rgba(255, 255, 255, 0.8)'
                    : theme.colors.textSecondary
                }}
              >
                {weatherDisplay}
                <span>天气: {weather}</span>
                <span className="ml-2">
                  {formatFullDateTime(entry.created_at!)}
                </span>
              </div>

              {entry.location && (
                <div
                  className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    color: theme.mode === 'glass'
                      ? 'rgba(255, 255, 255, 0.8)'
                      : theme.colors.textSecondary
                  }}
                  onClick={() => setLocationDetailOpen(true)}
                  title="点击查看详细位置信息"
                >
                  <MapPin className="w-4 h-4" />
                  <span>位置</span>
                  <span className="ml-1 font-medium">
                    {entry.location.name || '未知位置'}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 图片查看器 */}
      {entry.images && entry.images.length > 0 && (
        <ImageViewer
          images={entry.images}
          initialIndex={selectedImageIndex}
          isOpen={imageViewerOpen}
          onClose={() => setImageViewerOpen(false)}
        />
      )}

      {/* 位置详情弹窗 - 使用 Portal 渲染到 body */}
      {locationDetailOpen && entry.location && createPortal(
        <div
          className="location-detail-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            // 点击背景关闭弹窗
            if (e.target === e.currentTarget) {
              setLocationDetailOpen(false);
            }
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: theme.colors.background }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: theme.colors.text }}>
                <MapPin className="w-5 h-5" style={{ color: theme.colors.primary }} />
                位置详情
              </h3>
              <button
                onClick={() => setLocationDetailOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                style={{
                  backgroundColor: theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : undefined
                }}
              >
                <X className="w-5 h-5" style={{ color: theme.colors.text }} />
              </button>
            </div>

            <div className="space-y-3">
              {/* 位置名称 */}
              <div>
                <label className="text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
                  位置名称
                </label>
                <div className="mt-1 p-2 rounded border" style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text
                }}>
                  {entry.location.name || '未知位置'}
                </div>
              </div>

              {/* 详细地址 */}
              {entry.location.address && (
                <div>
                  <label className="text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
                    详细地址
                  </label>
                  <div className="mt-1 p-2 rounded border" style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }}>
                    {entry.location.address}
                  </div>
                </div>
              )}

              {/* GPS坐标 */}
              {(entry.location.latitude && entry.location.longitude) && (
                <div>
                  <label className="text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
                    GPS坐标
                  </label>
                  <div className="mt-1 p-2 rounded border font-mono text-sm" style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }}>
                    纬度: {entry.location.latitude.toFixed(6)}
                    <br />
                    经度: {entry.location.longitude.toFixed(6)}
                  </div>
                </div>
              )}

              {/* 位置详情 */}
              {entry.location.details && (
                <div>
                  <label className="text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
                    位置详情
                  </label>
                  <div className="mt-1 p-2 rounded border text-sm" style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }}>
                    {entry.location.details.country && (
                      <div>国家: {entry.location.details.country}</div>
                    )}
                    {entry.location.details.state && (
                      <div>省份: {entry.location.details.state}</div>
                    )}
                    {entry.location.details.city && (
                      <div>城市: {entry.location.details.city}</div>
                    )}
                    {entry.location.details.suburb && (
                      <div>区域: {entry.location.details.suburb}</div>
                    )}
                    {entry.location.details.road && (
                      <div>道路: {entry.location.details.road}</div>
                    )}
                    {entry.location.details.building && (
                      <div>建筑: {entry.location.details.building}</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setLocationDetailOpen(false)}
                className="px-4 py-2 rounded-md text-white font-medium"
                style={{ backgroundColor: theme.colors.primary }}
              >
                关闭
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
