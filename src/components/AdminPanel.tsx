import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  Download,
  Upload,
  Search,
  Eye,
  EyeOff,
  Shield,
  Key,
  Lock,
  Unlock,
  X,
  Trash2,
  Edit,
  Filter
} from 'lucide-react';
import { useThemeContext } from './ThemeProvider';
import { DiaryEntry } from '../types';
import { apiService } from '../services/api';
import { getSmartTimeDisplay } from '../utils/timeUtils';

// 管理员认证上下文
interface AdminAuthContextType {
  isAdminAuthenticated: boolean;
  setIsAdminAuthenticated: (authenticated: boolean) => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  // 从localStorage读取管理员认证状态
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    const saved = localStorage.getItem('diary-admin-authenticated');
    return saved === 'true';
  });

  // 当认证状态改变时，保存到localStorage
  const updateAdminAuth = (authenticated: boolean) => {
    setIsAdminAuthenticated(authenticated);
    localStorage.setItem('diary-admin-authenticated', authenticated.toString());
  };

  return (
    <AdminAuthContext.Provider value={{
      isAdminAuthenticated,
      setIsAdminAuthenticated: updateAdminAuth
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  entries: DiaryEntry[];
  onEntriesUpdate: () => void; // 改为刷新函数
  onEdit?: (entry: DiaryEntry) => void; // 添加编辑功能
}

interface AdminSettings {
  passwordProtection: boolean;
  adminPassword: string;
  showHiddenEntries: boolean;
}

interface PasswordSettings {
  enabled: boolean;
  password: string;
}

interface BackgroundSettings {
  enabled: boolean;
  imageUrl: string;
}

interface QuickFiltersSettings {
  enabled: boolean;
}

export function AdminPanel({ isOpen, onClose, entries, onEntriesUpdate, onEdit }: AdminPanelProps) {
  const { theme } = useThemeContext();
  const { isAdminAuthenticated, setIsAdminAuthenticated } = useAdminAuth();
  // 如果全局已认证，本地也设为已认证
  const [isAuthenticated, setIsAuthenticated] = useState(isAdminAuthenticated);
  const [passwordInput, setPasswordInput] = useState('');

  // 同步全局认证状态
  useEffect(() => {
    setIsAuthenticated(isAdminAuthenticated);
  }, [isAdminAuthenticated]);
  const [settings, setSettings] = useState<AdminSettings>({
    passwordProtection: false,
    adminPassword: 'admin123',
    showHiddenEntries: false,
  });

  // 从后端加载设置
  const loadSettings = async () => {
    try {
      const allSettings = await apiService.getAllSettings();
      setSettings(prev => ({
        ...prev,
        adminPassword: allSettings.admin_password || 'admin123',
        passwordProtection: allSettings.app_password_enabled === 'true',
      }));

      // 同时加载密码设置
      const passwordSettings = await getPasswordSettings();
      setCurrentPasswordSettings(passwordSettings);

      // 加载背景设置
      const backgroundSettings = await getBackgroundSettings();
      setCurrentBackgroundSettings(backgroundSettings);

      // 加载快速筛选设置
      const quickFiltersSettings = await getQuickFiltersSettings();
      setCurrentQuickFiltersSettings(quickFiltersSettings);
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  };

  // 组件挂载时加载设置
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPasswordSettings, setShowPasswordSettings] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showAppPasswordSettings, setShowAppPasswordSettings] = useState(false);
  const [newAppPassword, setNewAppPassword] = useState('');
  const [currentPasswordSettings, setCurrentPasswordSettings] = useState<PasswordSettings>({ enabled: false, password: 'diary123' });

  // 背景设置状态
  const [currentBackgroundSettings, setCurrentBackgroundSettings] = useState<BackgroundSettings>({
    enabled: false,
    imageUrl: ''
  });
  const [showBackgroundSettings, setShowBackgroundSettings] = useState(false);
  const [newBackgroundUrl, setNewBackgroundUrl] = useState('');

  // 快速筛选设置状态
  const [currentQuickFiltersSettings, setCurrentQuickFiltersSettings] = useState<QuickFiltersSettings>({
    enabled: true
  });

  // 保存设置到数据库
  const saveSettings = async (newSettings: AdminSettings) => {
    try {
      // 保存到数据库
      await apiService.setSetting('admin_password', newSettings.adminPassword);
      await apiService.setSetting('app_password_enabled', newSettings.passwordProtection.toString());

      // 更新本地状态
      setSettings(newSettings);

      console.log('设置已保存到数据库');
    } catch (error) {
      console.error('保存设置失败:', error);
      // 如果数据库保存失败，至少更新本地状态
      setSettings(newSettings);
    }
  };

  // 验证密码
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === settings.adminPassword) {
      setIsAuthenticated(true);
      setIsAdminAuthenticated(true); // 设置全局管理员状态
      setPasswordInput('');
    } else {
      alert('密码错误！');
      setPasswordInput('');
    }
  };

  // 处理关闭面板 - 不清除认证状态，只关闭面板
  const handleClose = () => {
    onClose();
  };

  // 退出管理员登录
  const handleLogout = () => {
    if (confirm('确定要退出管理员登录吗？')) {
      setIsAuthenticated(false);
      setIsAdminAuthenticated(false);
      onClose();
    }
  };

  // 导出所有日记
  const handleExportEntries = () => {
    const dataToExport = {
      entries: entries,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diary-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 导入日记
  const handleImportEntries = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.entries && Array.isArray(data.entries)) {
          const confirmImport = window.confirm(
            `确定要导入 ${data.entries.length} 条日记吗？这将覆盖现有数据！`
          );
          if (confirmImport) {
            try {
              await apiService.batchImportEntries(data.entries);
              onEntriesUpdate(); // 刷新数据
              alert('导入成功！');
            } catch (error) {
              alert('导入失败：' + (error instanceof Error ? error.message : '未知错误'));
            }
          }
        } else {
          alert('无效的备份文件格式！');
        }
      } catch (error) {
        alert('文件解析失败！请检查文件格式。');
      }
    };
    reader.readAsText(file);
  };

  // 操作状态管理
  const [operationStates, setOperationStates] = useState<Record<number, 'idle' | 'hiding' | 'showing' | 'deleting'>>({});

  // 通知状态管理
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
    visible: boolean;
  }>({ message: '', type: 'success', visible: false });

  // 更新操作状态
  const setOperationState = (entryId: number, state: 'idle' | 'hiding' | 'showing' | 'deleting') => {
    setOperationStates(prev => ({ ...prev, [entryId]: state }));
  };

  // 获取操作状态
  const getOperationState = (entryId: number) => operationStates[entryId] || 'idle';

  // 显示操作反馈
  const showOperationFeedback = (message: string, isError = false) => {
    setNotification({
      message,
      type: isError ? 'error' : 'success',
      visible: true
    });

    // 3秒后自动隐藏
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 1000);
  };

  // 切换日记隐藏状态 - 使用新的专用API
  const toggleEntryVisibility = async (entryId: number) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) {
      showOperationFeedback('日记信息异常，请刷新页面', true);
      return;
    }

    const isCurrentlyHidden = entry.hidden;
    const operation = isCurrentlyHidden ? 'showing' : 'hiding';

    setOperationState(entryId, operation);

    try {
      console.log(`切换隐藏状态: ID ${entryId}, 当前状态: ${isCurrentlyHidden ? '隐藏' : '显示'}`);

      // 使用专用的隐藏切换API
      await apiService.toggleEntryVisibility(entryId);

      // 刷新数据
      onEntriesUpdate();

      showOperationFeedback(
        isCurrentlyHidden ? '日记已显示' : '日记已隐藏'
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error('切换隐藏状态失败:', error);
      showOperationFeedback(`操作失败：${errorMessage}`, true);
    } finally {
      setOperationState(entryId, 'idle');
    }
  };

  // 删除日记
  const handleDeleteEntry = async (entryId: number) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) {
      // 这种情况理论上不应该发生，因为按钮是从现有日记列表渲染的
      showOperationFeedback('日记信息异常，请刷新页面', true);
      return;
    }

    const confirmMessage = `确定要删除日记"${entry.title || '无标题'}"吗？\n\n此操作不可恢复！`;
    if (!confirm(confirmMessage)) return;

    setOperationState(entryId, 'deleting');

    try {
      // 直接删除，不做额外检查
      await apiService.deleteEntry(entryId);

      // 等待数据同步
      await new Promise(resolve => setTimeout(resolve, 300));

      // 刷新数据
      onEntriesUpdate();

      showOperationFeedback('日记删除成功');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      showOperationFeedback(`删除失败：${errorMessage}`, true);
    } finally {
      setOperationState(entryId, 'idle');
    }
  };

  // 更改管理员密码
  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      alert('密码长度至少6位！');
      return;
    }

    try {
      await apiService.setSetting('admin_password', newPassword);
      const newSettings = { ...settings, adminPassword: newPassword };
      setSettings(newSettings);
      setNewPassword('');
      setShowPasswordSettings(false);
      alert('密码修改成功！');
    } catch (error) {
      alert('密码修改失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 获取应用密码设置
  const getPasswordSettings = async (): Promise<PasswordSettings> => {
    try {
      const allSettings = await apiService.getAllSettings();
      return {
        enabled: allSettings.app_password_enabled === 'true',
        password: allSettings.app_password || 'diary123'
      };
    } catch (error) {
      console.error('获取应用密码设置失败:', error);
      return { enabled: false, password: 'diary123' };
    }
  };

  // 保存应用密码设置
  const savePasswordSettings = async (passwordSettings: PasswordSettings) => {
    try {
      await apiService.setSetting('app_password_enabled', passwordSettings.enabled.toString());
      await apiService.setSetting('app_password', passwordSettings.password);

      // 同时更新本地设置状态
      const newSettings = { ...settings, passwordProtection: passwordSettings.enabled };
      setSettings(newSettings);
      setCurrentPasswordSettings(passwordSettings);

      console.log('应用密码设置已保存到数据库');
    } catch (error) {
      console.error('保存应用密码设置失败:', error);
      throw error;
    }
  };

  // 切换应用密码保护
  const toggleAppPasswordProtection = async () => {
    try {
      const newSettings = { ...currentPasswordSettings, enabled: !currentPasswordSettings.enabled };
      await savePasswordSettings(newSettings);
      alert(`应用密码保护已${newSettings.enabled ? '开启' : '关闭'}！`);
    } catch (error) {
      alert('设置修改失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 获取背景设置
  const getBackgroundSettings = async (): Promise<BackgroundSettings> => {
    try {
      const allSettings = await apiService.getAllSettings();
      return {
        enabled: allSettings.login_background_enabled === 'true',
        imageUrl: allSettings.login_background_url || ''
      };
    } catch (error) {
      console.error('获取背景设置失败:', error);
      return { enabled: false, imageUrl: '' };
    }
  };

  // 保存背景设置
  const saveBackgroundSettings = async (backgroundSettings: BackgroundSettings) => {
    try {
      await apiService.setSetting('login_background_enabled', backgroundSettings.enabled.toString());
      await apiService.setSetting('login_background_url', backgroundSettings.imageUrl);

      setCurrentBackgroundSettings(backgroundSettings);
      console.log('背景设置已保存到数据库');
    } catch (error) {
      console.error('保存背景设置失败:', error);
      throw error;
    }
  };

  // 切换背景功能
  const toggleBackground = async () => {
    try {
      const newSettings = { ...currentBackgroundSettings, enabled: !currentBackgroundSettings.enabled };
      await saveBackgroundSettings(newSettings);
      alert(`登录背景已${newSettings.enabled ? '开启' : '关闭'}！`);
    } catch (error) {
      alert('设置修改失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 更改应用密码
  const handleAppPasswordChange = async () => {
    if (newAppPassword.length < 6) {
      alert('密码长度至少6位！');
      return;
    }

    try {
      const newSettings = { ...currentPasswordSettings, password: newAppPassword };
      await savePasswordSettings(newSettings);
      setNewAppPassword('');
      setShowAppPasswordSettings(false);
      alert('应用密码修改成功！');
    } catch (error) {
      alert('应用密码修改失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 更改背景图片URL
  const handleBackgroundUrlChange = async () => {
    try {
      const newSettings = { ...currentBackgroundSettings, imageUrl: newBackgroundUrl };
      await saveBackgroundSettings(newSettings);
      setNewBackgroundUrl('');
      setShowBackgroundSettings(false);
      alert('背景图片设置成功！');
    } catch (error) {
      alert('背景图片设置失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 获取快速筛选设置
  const getQuickFiltersSettings = async (): Promise<QuickFiltersSettings> => {
    try {
      const allSettings = await apiService.getAllSettings();
      return {
        enabled: allSettings.quick_filters_enabled !== 'false' // 默认启用
      };
    } catch (error) {
      console.error('获取快速筛选设置失败:', error);
      return { enabled: true };
    }
  };

  // 保存快速筛选设置
  const saveQuickFiltersSettings = async (quickFiltersSettings: QuickFiltersSettings) => {
    try {
      await apiService.setSetting('quick_filters_enabled', quickFiltersSettings.enabled.toString());
      setCurrentQuickFiltersSettings(quickFiltersSettings);
      console.log('快速筛选设置已保存到数据库');
    } catch (error) {
      console.error('保存快速筛选设置失败:', error);
      throw error;
    }
  };

  // 切换快速筛选显示
  const toggleQuickFilters = async () => {
    try {
      const newSettings = { ...currentQuickFiltersSettings, enabled: !currentQuickFiltersSettings.enabled };
      await saveQuickFiltersSettings(newSettings);
      alert(`快速筛选功能已${newSettings.enabled ? '开启' : '关闭'}！`);
    } catch (error) {
      alert('设置修改失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 过滤日记（包括隐藏的）
  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         entry.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (settings.showHiddenEntries) {
      return matchesSearch;
    } else {
      return matchesSearch && !entry.hidden;
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl ${theme.effects.blur}`}
        style={{
          backgroundColor: theme.mode === 'glass' ? undefined : theme.colors.surface,
          border: theme.mode === 'glass' ? undefined : `1px solid ${theme.colors.border}`,
        }}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b"
             style={{ borderBottomColor: theme.colors.border }}>
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6" style={{ color: theme.colors.primary }} />
            <h2 className="text-xl font-bold" style={{ color: theme.colors.text }}>
              管理员面板
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* 退出登录按钮 - 只在已认证时显示 */}
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="px-3 py-1 text-sm rounded-lg hover:bg-opacity-80 transition-colors"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)'
                }}
              >
                退出登录
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-opacity-80 transition-colors"
              style={{ backgroundColor: theme.colors.border }}
            >
              <X className="w-5 h-5" style={{ color: theme.colors.text }} />
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-6">
          {!isAuthenticated ? (
            // 密码验证界面
            <div className="max-w-md mx-auto">
              <div className="text-center mb-6">
                <Key className="w-12 h-12 mx-auto mb-4" style={{ color: theme.colors.primary }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: theme.colors.text }}>
                  管理员验证
                </h3>
                <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                  请输入管理员密码以访问管理功能
                </p>
              </div>
              
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="输入管理员密码"
                  className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                    // focusRingColor: theme.colors.primary,
                  }}
                  required
                />
                <button
                  type="submit"
                  className="w-full py-3 rounded-lg font-medium transition-colors"
                  style={{
                    backgroundColor: theme.colors.primary,
                    color: 'white',
                  }}
                >
                  验证
                </button>
              </form>
            </div>
          ) : (
            // 管理员功能界面
            <div className="space-y-6">
              {/* 功能按钮区域 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 导出数据 */}
                <button
                  onClick={handleExportEntries}
                  className="flex items-center gap-3 p-4 rounded-lg border transition-colors hover:bg-opacity-80"
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  }}
                >
                  <Download className="w-5 h-5" style={{ color: theme.colors.primary }} />
                  <div className="text-left">
                    <div className="font-medium">导出数据</div>
                    <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
                      备份所有日记
                    </div>
                  </div>
                </button>

                {/* 导入数据 */}
                <label className="flex items-center gap-3 p-4 rounded-lg border transition-colors hover:bg-opacity-80 cursor-pointer"
                       style={{
                         backgroundColor: theme.colors.surface,
                         borderColor: theme.colors.border,
                         color: theme.colors.text,
                       }}>
                  <Upload className="w-5 h-5" style={{ color: theme.colors.primary }} />
                  <div className="text-left">
                    <div className="font-medium">导入数据</div>
                    <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
                      恢复备份文件
                    </div>
                  </div>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportEntries}
                    className="hidden"
                  />
                </label>

                {/* 密码设置 */}
                <button
                  onClick={() => setShowPasswordSettings(!showPasswordSettings)}
                  className="flex items-center gap-3 p-4 rounded-lg border transition-colors hover:bg-opacity-80"
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  }}
                >
                  <Key className="w-5 h-5" style={{ color: theme.colors.primary }} />
                  <div className="text-left">
                    <div className="font-medium">密码设置</div>
                    <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
                      修改管理密码
                    </div>
                  </div>
                </button>

                {/* 隐藏日记切换 */}
                <button
                  onClick={() => {
                    const newSettings = { ...settings, showHiddenEntries: !settings.showHiddenEntries };
                    saveSettings(newSettings);
                  }}
                  className="flex items-center gap-3 p-4 rounded-lg border transition-colors hover:bg-opacity-80"
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  }}
                >
                  {settings.showHiddenEntries ? (
                    <Eye className="w-5 h-5" style={{ color: theme.colors.primary }} />
                  ) : (
                    <EyeOff className="w-5 h-5" style={{ color: theme.colors.primary }} />
                  )}
                  <div className="text-left">
                    <div className="font-medium">
                      {settings.showHiddenEntries ? '隐藏' : '显示'}隐藏日记
                    </div>
                    <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
                      切换隐藏内容
                    </div>
                  </div>
                </button>
              </div>

              {/* 应用安全设置区域 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold" style={{ color: theme.colors.text }}>
                  应用安全设置
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 应用密码保护切换 */}
                  <button
                    onClick={toggleAppPasswordProtection}
                    className="flex items-center gap-3 p-4 rounded-lg border transition-colors hover:bg-opacity-80"
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    }}
                  >
                    {currentPasswordSettings.enabled ? (
                      <Lock className="w-5 h-5" style={{ color: theme.colors.primary }} />
                    ) : (
                      <Unlock className="w-5 h-5" style={{ color: theme.colors.primary }} />
                    )}
                    <div className="text-left">
                      <div className="font-medium">
                        {currentPasswordSettings.enabled ? '关闭' : '开启'}应用密码保护
                      </div>
                      <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
                        {currentPasswordSettings.enabled ? '允许无密码访问' : '需要密码才能访问应用'}
                      </div>
                    </div>
                  </button>

                  {/* 应用密码设置 */}
                  <button
                    onClick={() => setShowAppPasswordSettings(!showAppPasswordSettings)}
                    className="flex items-center gap-3 p-4 rounded-lg border transition-colors hover:bg-opacity-80"
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    }}
                  >
                    <Key className="w-5 h-5" style={{ color: theme.colors.primary }} />
                    <div className="text-left">
                      <div className="font-medium">应用密码设置</div>
                      <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
                        修改应用访问密码
                      </div>
                    </div>
                  </button>

                  {/* 登录背景设置 */}
                  <button
                    onClick={toggleBackground}
                    className="flex items-center gap-3 p-4 rounded-lg border transition-colors hover:bg-opacity-80"
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    }}
                  >
                    <Shield className="w-5 h-5" style={{ color: theme.colors.primary }} />
                    <div className="text-left">
                      <div className="font-medium">
                        {currentBackgroundSettings.enabled ? '关闭' : '开启'}登录背景
                      </div>
                      <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
                        {currentBackgroundSettings.enabled ? '显示透明背景' : '启用背景遮盖'}
                      </div>
                    </div>
                  </button>
                </div>

                {/* 背景图片设置按钮 */}
                <button
                  onClick={() => setShowBackgroundSettings(!showBackgroundSettings)}
                  className="flex items-center gap-3 p-4 rounded-lg border transition-colors hover:bg-opacity-80 w-full"
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  }}
                >
                  <Eye className="w-5 h-5" style={{ color: theme.colors.primary }} />
                  <div className="text-left">
                    <div className="font-medium">背景图片设置</div>
                    <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
                      自定义登录页面背景图片
                    </div>
                  </div>
                </button>

                {/* 应用密码修改区域 */}
                {showAppPasswordSettings && (
                  <div className="p-4 rounded-lg border" style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  }}>
                    <h4 className="font-medium mb-3" style={{ color: theme.colors.text }}>
                      修改应用访问密码
                    </h4>
                    <div className="flex gap-3">
                      <input
                        type="password"
                        value={newAppPassword}
                        onChange={(e) => setNewAppPassword(e.target.value)}
                        placeholder="输入新的应用密码（至少6位）"
                        className="flex-1 px-3 py-2 rounded border"
                        style={{
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                          color: theme.colors.text,
                        }}
                      />
                      <button
                        onClick={handleAppPasswordChange}
                        className="px-4 py-2 rounded font-medium"
                        style={{
                          backgroundColor: theme.colors.primary,
                          color: 'white',
                        }}
                      >
                        确认修改
                      </button>
                    </div>
                    <p className="text-xs mt-2" style={{ color: theme.colors.textSecondary }}>
                      当前密码：{currentPasswordSettings.password}
                    </p>
                  </div>
                )}

                {/* 背景图片修改区域 */}
                {showBackgroundSettings && (
                  <div className="p-4 rounded-lg border" style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  }}>
                    <h4 className="font-medium mb-3" style={{ color: theme.colors.text }}>
                      设置背景图片
                    </h4>
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <input
                          type="url"
                          value={newBackgroundUrl}
                          onChange={(e) => setNewBackgroundUrl(e.target.value)}
                          placeholder="输入图片链接（如：https://example.com/image.jpg）"
                          className="flex-1 px-3 py-2 rounded border"
                          style={{
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                            color: theme.colors.text,
                          }}
                        />
                        <button
                          onClick={handleBackgroundUrlChange}
                          className="px-4 py-2 rounded font-medium"
                          style={{
                            backgroundColor: theme.colors.primary,
                            color: 'white',
                          }}
                        >
                          确认设置
                        </button>
                      </div>
                      <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
                        当前背景：{currentBackgroundSettings.imageUrl || '未设置'}
                      </p>
                      <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
                        提示：建议使用高质量图片，支持jpg、png、webp格式
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 界面设置区域 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold" style={{ color: theme.colors.text }}>
                  界面设置
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 快速筛选功能切换 */}
                  <button
                    onClick={toggleQuickFilters}
                    className="flex items-center gap-3 p-4 rounded-lg border transition-colors hover:bg-opacity-80"
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    }}
                  >
                    <Filter className="w-5 h-5" style={{ color: theme.colors.primary }} />
                    <div className="text-left">
                      <div className="font-medium">
                        {currentQuickFiltersSettings.enabled ? '关闭' : '开启'}快速筛选
                      </div>
                      <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
                        {currentQuickFiltersSettings.enabled ? '隐藏快速筛选功能' : '显示快速筛选功能'}
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* 密码修改区域 */}
              {showPasswordSettings && (
                <div className="p-4 rounded-lg border" style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                }}>
                  <h4 className="font-medium mb-3" style={{ color: theme.colors.text }}>
                    修改管理员密码
                  </h4>
                  <div className="flex gap-3">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="输入新密码（至少6位）"
                      className="flex-1 px-3 py-2 rounded border"
                      style={{
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                        color: theme.colors.text,
                      }}
                    />
                    <button
                      onClick={handlePasswordChange}
                      className="px-4 py-2 rounded font-medium"
                      style={{
                        backgroundColor: theme.colors.primary,
                        color: 'white',
                      }}
                    >
                      确认修改
                    </button>
                  </div>
                </div>
              )}

              {/* 搜索区域 */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Search className="w-5 h-5" style={{ color: theme.colors.primary }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索日记内容..."
                    className="flex-1 px-4 py-2 rounded-lg border"
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    }}
                  />
                </div>

                {/* 日记列表 */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                      style={{
                        backgroundColor: entry.hidden ? 'rgba(255, 0, 0, 0.1)' : theme.colors.surface,
                        borderColor: theme.colors.border,
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium" style={{ color: theme.colors.text }}>
                          {entry.title || '无标题'}
                          {entry.hidden && (
                            <span className="ml-2 text-xs px-2 py-1 rounded bg-red-500 text-white">
                              隐藏
                            </span>
                          )}
                        </div>
                        <div className="text-sm truncate" style={{ color: theme.colors.textSecondary }}>
                          {entry.content.substring(0, 50)}
                          {entry.content.length > 50 && '...'}
                        </div>
                        <div className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>
                          {getSmartTimeDisplay(entry.created_at!).tooltip}
                        </div>
                      </div>

                      <EntryActionButtons
                        entry={entry}
                        operationState={getOperationState(entry.id!)}
                        onEdit={onEdit ? () => {
                          onEdit(entry);
                          onClose();
                        } : undefined}
                        onToggleVisibility={() => toggleEntryVisibility(entry.id!)}
                        onDelete={() => handleDeleteEntry(entry.id!)}
                        theme={theme}
                      />
                    </div>
                  ))}

                  {filteredEntries.length === 0 && (
                    <div className="text-center py-8" style={{ color: theme.colors.textSecondary }}>
                      {searchQuery ? '没有找到匹配的日记' : '暂无日记'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 通知组件 */}
      {notification.visible && (
        <NotificationToast
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(prev => ({ ...prev, visible: false }))}
        />
      )}
    </div>
  );
}

// 通知组件
interface NotificationToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

function NotificationToast({ message, type, onClose }: NotificationToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div
        className={`p-4 rounded-lg shadow-lg border-l-4 ${
          type === 'success'
            ? 'bg-green-50 border-green-400 text-green-800'
            : 'bg-red-50 border-red-400 text-red-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{message}</p>
          <button
            onClick={onClose}
            className="ml-3 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// 日记操作按钮组件
interface EntryActionButtonsProps {
  entry: DiaryEntry;
  operationState: 'idle' | 'hiding' | 'showing' | 'deleting';
  onEdit?: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
  theme: any;
}

function EntryActionButtons({
  entry,
  operationState,
  onEdit,
  onToggleVisibility,
  onDelete,
  theme
}: EntryActionButtonsProps) {
  const isOperating = operationState !== 'idle';

  return (
    <div className="flex items-center gap-2 ml-3">
      {/* 编辑按钮 */}
      {onEdit && (
        <ActionButton
          onClick={onEdit}
          disabled={isOperating}
          icon={<Edit className="w-4 h-4" />}
          title="编辑日记"
          variant="primary"
          theme={theme}
        />
      )}

      {/* 隐藏/显示按钮 */}
      <ActionButton
        onClick={onToggleVisibility}
        disabled={isOperating}
        loading={operationState === 'hiding' || operationState === 'showing'}
        icon={entry.hidden ?
          <Eye className="w-4 h-4" /> :
          <EyeOff className="w-4 h-4" />
        }
        title={entry.hidden ? "显示日记" : "隐藏日记"}
        variant="secondary"
        theme={theme}
      />

      {/* 删除按钮 */}
      <ActionButton
        onClick={onDelete}
        disabled={isOperating}
        loading={operationState === 'deleting'}
        icon={<Trash2 className="w-4 h-4" />}
        title="删除日记"
        variant="danger"
        theme={theme}
      />
    </div>
  );
}

// 通用操作按钮组件
interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon: React.ReactNode;
  title: string;
  variant: 'primary' | 'secondary' | 'danger';
  theme: any;
}

function ActionButton({
  onClick,
  disabled = false,
  loading = false,
  icon,
  title,
  variant,
  theme
}: ActionButtonProps) {
  const getButtonStyles = () => {
    const baseStyles = {
      opacity: disabled ? 0.5 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyles,
          backgroundColor: `${theme.colors.primary}20`,
          color: theme.colors.primary,
        };
      case 'danger':
        return {
          ...baseStyles,
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
        };
      case 'secondary':
      default:
        return {
          ...baseStyles,
          backgroundColor: theme.colors.border,
          color: theme.colors.text,
        };
    }
  };

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className="p-2 rounded hover:bg-opacity-80 transition-colors relative"
      style={getButtonStyles()}
      title={disabled ? '操作进行中...' : title}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon
      )}
    </button>
  );
}
