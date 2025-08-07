import { useState } from 'react';
import { Download, X, FileText, Database } from 'lucide-react';
import { useThemeContext } from './ThemeProvider';
import { DiaryEntry } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: DiaryEntry[];
  exportType: string; // '搜索结果' | '筛选结果' | '全部日记'
}

export function ExportModal({ isOpen, onClose, entries, exportType }: ExportModalProps) {
  const { theme } = useThemeContext();
  const [exportFormat, setExportFormat] = useState<'json' | 'txt'>('json');
  const [includeHidden, setIncludeHidden] = useState(false);

  if (!isOpen) return null;

  const visibleEntries = includeHidden ? entries : entries.filter(entry => !entry.hidden);

  const handleExport = () => {
    if (visibleEntries.length === 0) {
      alert('没有可导出的日记！');
      return;
    }

    const fileName = `diary-${exportType === '全部日记' ? 'all' : exportType === '搜索结果' ? 'search' : 'filter'}-${new Date().toISOString().split('T')[0]}`;

    if (exportFormat === 'json') {
      exportAsJSON(fileName);
    } else {
      exportAsText(fileName);
    }

    onClose();
  };

  const exportAsJSON = (fileName: string) => {
    const dataToExport = {
      entries: visibleEntries,
      exportDate: new Date().toISOString(),
      exportType: exportType,
      totalCount: visibleEntries.length,
      includeHidden: includeHidden,
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json'
    });
    
    downloadFile(blob, `${fileName}.json`);
    alert(`成功导出 ${visibleEntries.length} 条日记（${exportType}）为 JSON 格式！`);
  };

  const exportAsText = (fileName: string) => {
    let textContent = `# ${exportType}\n\n`;
    textContent += `导出时间: ${new Date().toLocaleString('zh-CN')}\n`;
    textContent += `日记数量: ${visibleEntries.length} 条\n`;
    textContent += `包含隐藏日记: ${includeHidden ? '是' : '否'}\n\n`;
    textContent += '=' .repeat(50) + '\n\n';

    visibleEntries.forEach((entry, index) => {
      textContent += `## ${index + 1}. ${entry.title || '无标题'}\n\n`;
      textContent += `📅 创建时间: ${new Date(entry.created_at!).toLocaleString('zh-CN')}\n`;
      
      if (entry.mood && entry.mood !== 'neutral') {
        textContent += `😊 心情: ${getMoodLabel(entry.mood)}\n`;
      }
      
      if (entry.weather && entry.weather !== 'unknown') {
        textContent += `🌤️ 天气: ${getWeatherLabel(entry.weather)}\n`;
      }
      
      if (entry.tags && entry.tags.length > 0) {
        textContent += `🏷️ 标签: ${entry.tags.map(tag => `#${tag}`).join(' ')}\n`;
      }
      
      if (entry.location && entry.location.name) {
        textContent += `📍 位置: ${entry.location.name}\n`;
      }
      
      textContent += '\n';
      textContent += entry.content;
      textContent += '\n\n';
      textContent += '-'.repeat(30) + '\n\n';
    });

    const blob = new Blob([textContent], {
      type: 'text/plain;charset=utf-8'
    });
    
    downloadFile(blob, `${fileName}.txt`);
    alert(`成功导出 ${visibleEntries.length} 条日记（${exportType}）为文本格式！`);
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getMoodLabel = (mood: string) => {
    const moodLabels: Record<string, string> = {
      happy: '开心',
      sad: '难过',
      neutral: '平静',
      excited: '兴奋',
      anxious: '焦虑',
      peaceful: '平和'
    };
    return moodLabels[mood] || mood;
  };

  const getWeatherLabel = (weather: string) => {
    const weatherLabels: Record<string, string> = {
      sunny: '晴天',
      cloudy: '多云',
      rainy: '雨天',
      snowy: '雪天'
    };
    return weatherLabels[weather] || weather;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '16px',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
      onClick={(e) => {
        // 点击背景关闭弹窗
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-md rounded-xl shadow-2xl"
        style={{
          backgroundColor: theme.colors.surface,
          border: `1px solid ${theme.colors.border}`
        }}
        onClick={(e) => {
          // 防止点击弹窗内容时关闭弹窗
          e.stopPropagation();
        }}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: theme.colors.border }}>
          <h2 className="text-xl font-semibold" style={{ color: theme.colors.text }}>
            导出{exportType}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-opacity-80 transition-colors"
            style={{ backgroundColor: theme.colors.border }}
          >
            <X className="w-5 h-5" style={{ color: theme.colors.text }} />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-6 space-y-6">
          {/* 统计信息 */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: `${theme.colors.primary}10` }}>
            <p className="text-sm" style={{ color: theme.colors.text }}>
              将导出 <span className="font-semibold" style={{ color: theme.colors.primary }}>
                {visibleEntries.length}
              </span> 条日记
            </p>
          </div>

          {/* 导出格式选择 */}
          <div className="space-y-3">
            <label className="text-sm font-medium" style={{ color: theme.colors.text }}>
              导出格式
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-opacity-50"
                     style={{ 
                       borderColor: exportFormat === 'json' ? theme.colors.primary : theme.colors.border,
                       backgroundColor: exportFormat === 'json' ? `${theme.colors.primary}10` : 'transparent'
                     }}>
                <input
                  type="radio"
                  name="format"
                  value="json"
                  checked={exportFormat === 'json'}
                  onChange={(e) => setExportFormat(e.target.value as 'json')}
                  style={{ accentColor: theme.colors.primary }}
                />
                <Database className="w-5 h-5" style={{ color: theme.colors.primary }} />
                <div>
                  <div className="font-medium" style={{ color: theme.colors.text }}>JSON 格式</div>
                  <div className="text-xs" style={{ color: theme.colors.textSecondary }}>
                    完整数据，可重新导入
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-opacity-50"
                     style={{ 
                       borderColor: exportFormat === 'txt' ? theme.colors.primary : theme.colors.border,
                       backgroundColor: exportFormat === 'txt' ? `${theme.colors.primary}10` : 'transparent'
                     }}>
                <input
                  type="radio"
                  name="format"
                  value="txt"
                  checked={exportFormat === 'txt'}
                  onChange={(e) => setExportFormat(e.target.value as 'txt')}
                  style={{ accentColor: theme.colors.primary }}
                />
                <FileText className="w-5 h-5" style={{ color: theme.colors.primary }} />
                <div>
                  <div className="font-medium" style={{ color: theme.colors.text }}>文本格式</div>
                  <div className="text-xs" style={{ color: theme.colors.textSecondary }}>
                    纯文本，易于阅读
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* 包含隐藏日记选项 */}
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={includeHidden}
                onChange={(e) => setIncludeHidden(e.target.checked)}
                style={{ accentColor: theme.colors.primary }}
              />
              <span className="text-sm" style={{ color: theme.colors.text }}>
                包含隐藏的日记
              </span>
            </label>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3 p-6 border-t" style={{ borderColor: theme.colors.border }}>
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-lg border transition-colors"
            style={{
              borderColor: theme.colors.border,
              color: theme.colors.text,
              backgroundColor: 'transparent'
            }}
          >
            取消
          </button>
          <button
            onClick={handleExport}
            className="flex-1 py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            style={{
              backgroundColor: theme.colors.primary,
              color: 'white'
            }}
          >
            <Download className="w-4 h-4" />
            导出
          </button>
        </div>
      </div>
    </div>
  );
}
