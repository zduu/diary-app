import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface ExportSettings {
  enabled: boolean;
}

export function useExportSettings() {
  const [settings, setSettings] = useState<ExportSettings>({
    enabled: true // 默认启用
  });
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const allSettings = await apiService.getAllSettings();
      setSettings({
        enabled: allSettings.export_enabled !== 'false' // 默认启用，除非明确设置为false
      });
    } catch (error) {
      console.error('获取导出功能设置失败:', error);
      // 出错时使用默认设置
      setSettings({ enabled: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    loading,
    refreshSettings: loadSettings
  };
}
