import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface QuickFiltersSettings {
  enabled: boolean;
}

export function useQuickFiltersSettings() {
  const [settings, setSettings] = useState<QuickFiltersSettings>({
    enabled: true // 默认启用
  });
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const allSettings = await apiService.getAllSettings();
      setSettings({
        enabled: allSettings.quick_filters_enabled !== 'false' // 默认启用，除非明确设置为false
      });
    } catch (error) {
      console.error('获取快速筛选设置失败:', error);
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
