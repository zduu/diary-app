import { useState, useEffect } from 'react';
import { Settings, Database, Cloud, Trash2, Download, Upload } from 'lucide-react';
import { apiService } from '../services/api';

export function DevTools() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState<'local' | 'remote'>('local');
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    setCurrentMode(apiService.getCurrentMode());
    setIsDev(import.meta.env.DEV);
  }, []);

  // 只在开发环境显示
  if (!isDev) return null;

  const handleModeSwitch = (mode: 'local' | 'remote') => {
    if (mode === 'local') {
      apiService.enableLocalMode();
    } else {
      apiService.enableRemoteMode();
    }
    setCurrentMode(mode);
    window.location.reload(); // 刷新页面以应用新模式
  };

  const handleClearLocalData = () => {
    if (confirm('确定要清除所有本地数据吗？此操作不可恢复。')) {
      apiService.clearLocalData();
      window.location.reload();
    }
  };

  const handleExportData = async () => {
    try {
      const entries = await apiService.getAllEntries();
      const settings = await apiService.getAllSettings();
      const data = { entries, settings, exportTime: new Date().toISOString() };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diary-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('导出失败: ' + error);
    }
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (data.entries && Array.isArray(data.entries)) {
          await apiService.batchImportEntries(data.entries);
          alert(`成功导入 ${data.entries.length} 条日记`);
          window.location.reload();
        } else {
          alert('无效的备份文件格式');
        }
      } catch (error) {
        alert('导入失败: ' + error);
      }
    };
    input.click();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* 开发工具按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
        title="开发工具"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* 开发工具面板 */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-80">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            开发工具
          </h3>
          
          {/* 模式切换 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              数据源模式
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => handleModeSwitch('local')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentMode === 'local'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Database className="w-4 h-4" />
                本地
              </button>
              <button
                onClick={() => handleModeSwitch('remote')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentMode === 'remote'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Cloud className="w-4 h-4" />
                远程
              </button>
            </div>
          </div>

          {/* 数据操作 */}
          <div className="space-y-2">
            <button
              onClick={handleExportData}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-md text-sm font-medium hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
            >
              <Download className="w-4 h-4" />
              导出数据
            </button>
            
            <button
              onClick={handleImportData}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-md text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
            >
              <Upload className="w-4 h-4" />
              导入数据
            </button>
            
            {currentMode === 'local' && (
              <button
                onClick={handleClearLocalData}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded-md text-sm font-medium hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                清除本地数据
              </button>
            )}
          </div>

          {/* 状态信息 */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              当前模式: <span className="font-medium">{currentMode === 'local' ? '本地Mock' : '远程API'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
