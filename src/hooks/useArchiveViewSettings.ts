import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface ArchiveViewSettings {
  enabled: boolean;
}

export function useArchiveViewSettings() {
  const [settings, setSettings] = useState<ArchiveViewSettings>({
    enabled: true // 默认启用
  });
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const allSettings = await apiService.getAllSettings();
      setSettings({
        enabled: allSettings.archive_view_enabled !== 'false' // 默认启用，除非明确设置为false
      });
    } catch (error) {
      console.error('获取归纳视图设置失败:', error);
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
