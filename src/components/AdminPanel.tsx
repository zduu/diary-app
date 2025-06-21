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
  Edit
} from 'lucide-react';
import { useThemeContext } from './ThemeProvider';
import { DiaryEntry } from '../types';
import { apiService } from '../services/api';

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
      }));
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

  // 从localStorage加载设置
  useEffect(() => {
    const savedSettings = localStorage.getItem('diary-admin-settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // 保存设置到localStorage
  const saveSettings = (newSettings: AdminSettings) => {
    setSettings(newSettings);
    localStorage.setItem('diary-admin-settings', JSON.stringify(newSettings));
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

  // 切换日记隐藏状态
  const toggleEntryVisibility = async (entryId: number) => {
    try {
      const entry = entries.find(e => e.id === entryId);
      if (!entry) return;

      await apiService.updateEntry(entryId, { hidden: !entry.hidden });
      onEntriesUpdate(); // 刷新数据
    } catch (error) {
      alert('更新失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 删除日记
  const handleDeleteEntry = async (entryId: number) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    const confirmMessage = `确定要删除日记"${entry.title || '无标题'}"吗？此操作不可恢复！`;
    if (!confirm(confirmMessage)) return;

    try {
      // 显示删除中状态
      const deleteButton = document.querySelector(`[data-entry-id="${entryId}"]`) as HTMLButtonElement;
      if (deleteButton) {
        deleteButton.textContent = '删除中...';
        deleteButton.disabled = true;
      }

      await apiService.deleteEntry(entryId);

      // 等待一段时间确保数据同步
      await new Promise(resolve => setTimeout(resolve, 500));

      // 刷新数据
      onEntriesUpdate();

      // 验证删除是否成功
      setTimeout(() => {
        const stillExists = entries.find(e => e.id === entryId);
        if (stillExists) {
          alert('删除操作正在同步中，请稍后刷新页面查看结果');
        } else {
          alert('删除成功！');
        }
      }, 1000);

    } catch (error) {
      alert('删除失败：' + (error instanceof Error ? error.message : '未知错误'));

      // 恢复按钮状态
      const deleteButton = document.querySelector(`[data-entry-id="${entryId}"]`) as HTMLButtonElement;
      if (deleteButton) {
        deleteButton.textContent = '删除';
        deleteButton.disabled = false;
      }
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
      saveSettings(newSettings); // 同时保存到localStorage作为备份
      setNewPassword('');
      setShowPasswordSettings(false);
      alert('密码修改成功！');
    } catch (error) {
      alert('密码修改失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 获取应用密码设置
  const getPasswordSettings = (): PasswordSettings => {
    const settings = localStorage.getItem('diary-password-settings');
    if (settings) {
      return JSON.parse(settings);
    }
    return { enabled: false, password: 'diary123' };
  };

  // 保存应用密码设置
  const savePasswordSettings = async (settings: PasswordSettings) => {
    try {
      await apiService.setSetting('app_password_enabled', settings.enabled.toString());
      await apiService.setSetting('app_password', settings.password);
      localStorage.setItem('diary-password-settings', JSON.stringify(settings));
    } catch (error) {
      console.error('保存应用密码设置失败:', error);
      // 如果后端保存失败，至少保存到localStorage
      localStorage.setItem('diary-password-settings', JSON.stringify(settings));
    }
  };

  // 切换应用密码保护
  const toggleAppPasswordProtection = async () => {
    try {
      const currentSettings = getPasswordSettings();
      const newSettings = { ...currentSettings, enabled: !currentSettings.enabled };
      await savePasswordSettings(newSettings);
      alert(newSettings.enabled ? '应用密码保护已开启' : '应用密码保护已关闭');
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
      const currentSettings = getPasswordSettings();
      const newSettings = { ...currentSettings, password: newAppPassword };
      await savePasswordSettings(newSettings);
      setNewAppPassword('');
      setShowAppPasswordSettings(false);
      alert('应用密码修改成功！');
    } catch (error) {
      alert('应用密码修改失败：' + (error instanceof Error ? error.message : '未知错误'));
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    {getPasswordSettings().enabled ? (
                      <Lock className="w-5 h-5" style={{ color: theme.colors.primary }} />
                    ) : (
                      <Unlock className="w-5 h-5" style={{ color: theme.colors.primary }} />
                    )}
                    <div className="text-left">
                      <div className="font-medium">
                        {getPasswordSettings().enabled ? '关闭' : '开启'}应用密码保护
                      </div>
                      <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
                        {getPasswordSettings().enabled ? '允许无密码访问' : '需要密码才能访问应用'}
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
                </div>

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
                      当前密码：{getPasswordSettings().password}
                    </p>
                  </div>
                )}
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
                          {new Date(entry.created_at!).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-3">
                        {/* 编辑按钮 */}
                        {onEdit && (
                          <button
                            onClick={() => {
                              onEdit(entry);
                              onClose(); // 关闭管理员面板
                            }}
                            className="p-2 rounded hover:bg-opacity-80 transition-colors"
                            style={{
                              backgroundColor: `${theme.colors.primary}20`,
                              color: theme.colors.primary
                            }}
                            title="编辑"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}

                        {/* 隐藏/显示按钮 */}
                        <button
                          onClick={() => toggleEntryVisibility(entry.id!)}
                          className="p-2 rounded hover:bg-opacity-80 transition-colors"
                          style={{ backgroundColor: theme.colors.border }}
                          title={entry.hidden ? "显示" : "隐藏"}
                        >
                          {entry.hidden ? (
                            <Eye className="w-4 h-4" style={{ color: theme.colors.text }} />
                          ) : (
                            <EyeOff className="w-4 h-4" style={{ color: theme.colors.text }} />
                          )}
                        </button>

                        {/* 删除按钮 */}
                        <button
                          onClick={() => handleDeleteEntry(entry.id!)}
                          data-entry-id={entry.id}
                          className="p-2 rounded hover:bg-opacity-80 transition-colors"
                          style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444'
                          }}
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
    </div>
  );
}
