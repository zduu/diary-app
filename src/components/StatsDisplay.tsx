import { useState, useEffect } from 'react';
import { Calendar, BookOpen, Flame, Clock } from 'lucide-react';
import { useThemeContext } from './ThemeProvider';
import { apiService } from '../services/api';
import { DiaryStats } from '../types';

interface StatsDisplayProps {
  className?: string;
  apiKey?: string; // 可选的API密钥
}

export function StatsDisplay({ className = '', apiKey }: StatsDisplayProps) {
  const { theme } = useThemeContext();
  const [stats, setStats] = useState<DiaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = apiKey ? await apiService.getStatsWithKey(apiKey) : await apiService.getStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取统计信息失败');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '暂无';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (dateString: string | null) => {
    if (!dateString) return '暂无';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className={`p-4 rounded-lg ${className}`} style={{ backgroundColor: theme.colors.surface }}>
        <div className="text-center" style={{ color: theme.colors.textSecondary }}>
          加载统计信息中...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 rounded-lg ${className}`} style={{ backgroundColor: theme.colors.surface }}>
        <div className="text-center" style={{ color: '#ef4444' }}>
          {error}
        </div>
        <button
          onClick={loadStats}
          className="mt-2 px-3 py-1 rounded text-sm"
          style={{
            backgroundColor: theme.colors.primary,
            color: 'white'
          }}
        >
          重试
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const statItems = [
    {
      icon: <Flame className="w-5 h-5" />,
      label: '连续记录',
      value: `${stats.consecutive_days} 天`,
      detail: stats.current_streak_start ? `自 ${formatDateShort(stats.current_streak_start)}` : '',
      color: stats.consecutive_days > 0 ? '#f59e0b' : theme.colors.textSecondary
    },
    {
      icon: <Calendar className="w-5 h-5" />,
      label: '记录天数',
      value: `${stats.total_days_with_entries} 天`,
      detail: '',
      color: theme.colors.primary
    },
    {
      icon: <BookOpen className="w-5 h-5" />,
      label: '日记总数',
      value: `${stats.total_entries} 篇`,
      detail: '',
      color: theme.colors.accent
    },
    {
      icon: <Clock className="w-5 h-5" />,
      label: '最近记录',
      value: formatDateShort(stats.latest_entry_date),
      detail: formatDate(stats.latest_entry_date),
      color: theme.colors.textSecondary
    }
  ];

  return (
    <div className={`p-4 rounded-lg ${className}`} style={{ backgroundColor: theme.colors.surface }}>
      <h3 className="text-lg font-semibold mb-4" style={{ color: theme.colors.text }}>
        📊 日记统计
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        {statItems.map((item, index) => (
          <div
            key={index}
            className="p-3 rounded-lg border"
            style={{
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <div style={{ color: item.color }}>
                {item.icon}
              </div>
              <span className="text-sm" style={{ color: theme.colors.textSecondary }}>
                {item.label}
              </span>
            </div>
            <div className="font-semibold" style={{ color: theme.colors.text }}>
              {item.value}
            </div>
            {item.detail && (
              <div className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>
                {item.detail}
              </div>
            )}
          </div>
        ))}
      </div>

      {stats.first_entry_date && (
        <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: theme.colors.background }}>
          <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
            📅 开始记录于：{formatDate(stats.first_entry_date)}
          </div>
        </div>
      )}
    </div>
  );
}
