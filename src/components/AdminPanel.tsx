import React, { useState, useEffect, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
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
  Filter,
  Archive
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



interface QuickFiltersSettings {
  enabled: boolean;
}

interface ExportSettings {
  enabled: boolean;
}

interface ArchiveViewSettings {
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



      // 加载快速筛选设置
      const quickFiltersSettings = await getQuickFiltersSettings();
      setCurrentQuickFiltersSettings(quickFiltersSettings);

      // 加载导出功能设置
      const exportSettings = await getExportSettings();
      setCurrentExportSettings(exportSettings);

      // 加载归纳视图设置
      const archiveViewSettings = await getArchiveViewSettings();
      setCurrentArchiveViewSettings(archiveViewSettings);
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



  // 快速筛选设置状态
  const [currentQuickFiltersSettings, setCurrentQuickFiltersSettings] = useState<QuickFiltersSettings>({
    enabled: true
  });

  // 导出功能设置状态
  const [currentExportSettings, setCurrentExportSettings] = useState<ExportSettings>({
    enabled: true
  });

  // 归纳视图设置状态
  const [currentArchiveViewSettings, setCurrentArchiveViewSettings] = useState<ArchiveViewSettings>({
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
          // 显示导入模式选择对话框
          const importMode = await showImportModeDialog(data.entries.length, entries.length);
          if (importMode === null) return; // 用户取消

          try {
            await apiService.batchImportEntries(data.entries, { overwrite: importMode === 'overwrite' });
            onEntriesUpdate(); // 刷新数据

            const modeText = importMode === 'overwrite' ? '覆盖导入' : '合并导入';
            alert(`${modeText}成功！已导入 ${data.entries.length} 条日记。`);
          } catch (error) {
            alert('导入失败：' + (error instanceof Error ? error.message : '未知错误'));
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

  // 显示导入模式选择对话框
  const showImportModeDialog = (importCount: number, existingCount: number): Promise<'merge' | 'overwrite' | null> => {
    return new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        font-family: system-ui, -apple-system, sans-serif;
      `;

      const isGlass = document.body.classList.contains('theme-glass');

      dialog.innerHTML = `
        <div style="
          background: ${isGlass ? 'rgba(15, 23, 42, 0.95)' : 'white'};
          backdrop-filter: ${isGlass ? 'blur(20px)' : 'none'};
          border: ${isGlass ? '1px solid rgba(99, 102, 241, 0.3)' : 'none'};
          border-radius: 16px;
          padding: 24px;
          max-width: 480px;
          width: 90%;
          box-shadow: ${isGlass ? '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(99, 102, 241, 0.2)' : '0 20px 25px -5px rgba(0, 0, 0, 0.1)'};
        ">
          <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: ${isGlass ? '#ffffff' : '#1f2937'}; text-shadow: ${isGlass ? '0 2px 4px rgba(0, 0, 0, 0.6)' : 'none'};">
            选择导入模式
          </h3>
          <p style="margin: 0 0 20px 0; color: ${isGlass ? 'rgba(255, 255, 255, 0.9)' : '#6b7280'}; line-height: 1.5;">
            即将导入 <strong>${importCount}</strong> 条日记，当前已有 <strong>${existingCount}</strong> 条日记。
          </p>

          <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
            <label style="
              display: flex;
              align-items: flex-start;
              gap: 12px;
              padding: 16px;
              border: 2px solid ${isGlass ? 'rgba(99, 102, 241, 0.3)' : '#e5e7eb'};
              background: ${isGlass ? 'rgba(99, 102, 241, 0.1)' : 'white'};
              border-radius: 8px;
              cursor: pointer;
              transition: all 0.2s;
            " onmouseover="this.style.borderColor='${isGlass ? 'rgba(99, 102, 241, 0.6)' : '#3b82f6'}'; this.style.backgroundColor='${isGlass ? 'rgba(99, 102, 241, 0.2)' : '#f8fafc'}';"
               onmouseout="this.style.borderColor='${isGlass ? 'rgba(99, 102, 241, 0.3)' : '#e5e7eb'}'; this.style.backgroundColor='${isGlass ? 'rgba(99, 102, 241, 0.1)' : 'white'}';">
              <input type="radio" name="importMode" value="merge" checked style="margin-top: 2px;">
              <div>
                <div style="font-weight: 600; color: ${isGlass ? '#ffffff' : '#1f2937'}; margin-bottom: 4px; text-shadow: ${isGlass ? '0 1px 2px rgba(0, 0, 0, 0.5)' : 'none'};">
                  🔗 合并导入（推荐）
                </div>
                <div style="color: ${isGlass ? 'rgba(255, 255, 255, 0.8)' : '#6b7280'}; font-size: 14px; line-height: 1.4;">
                  保留现有的 ${existingCount} 条日记，添加新的 ${importCount} 条日记
                </div>
              </div>
            </label>

            <label style="
              display: flex;
              align-items: flex-start;
              gap: 12px;
              padding: 16px;
              border: 2px solid ${isGlass ? 'rgba(239, 68, 68, 0.3)' : '#e5e7eb'};
              background: ${isGlass ? 'rgba(239, 68, 68, 0.1)' : 'white'};
              border-radius: 8px;
              cursor: pointer;
              transition: all 0.2s;
            " onmouseover="this.style.borderColor='${isGlass ? 'rgba(239, 68, 68, 0.6)' : '#ef4444'}'; this.style.backgroundColor='${isGlass ? 'rgba(239, 68, 68, 0.2)' : '#fef2f2'}';"
               onmouseout="this.style.borderColor='${isGlass ? 'rgba(239, 68, 68, 0.3)' : '#e5e7eb'}'; this.style.backgroundColor='${isGlass ? 'rgba(239, 68, 68, 0.1)' : 'white'}';">
              <input type="radio" name="importMode" value="overwrite" style="margin-top: 2px;">
              <div>
                <div style="font-weight: 600; color: ${isGlass ? '#ffffff' : '#1f2937'}; margin-bottom: 4px; text-shadow: ${isGlass ? '0 1px 2px rgba(0, 0, 0, 0.5)' : 'none'};">
                  🔄 覆盖导入
                </div>
                <div style="color: ${isGlass ? 'rgba(255, 255, 255, 0.8)' : '#6b7280'}; font-size: 14px; line-height: 1.4;">
                  删除现有的所有日记，只保留导入的 ${importCount} 条日记
                </div>
              </div>
            </label>
          </div>

          <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button id="cancelBtn" style="
              padding: 8px 16px;
              border: 1px solid ${isGlass ? 'rgba(255, 255, 255, 0.3)' : '#d1d5db'};
              background: ${isGlass ? 'rgba(255, 255, 255, 0.1)' : 'white'};
              color: ${isGlass ? '#ffffff' : '#374151'};
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              text-shadow: ${isGlass ? '0 1px 2px rgba(0, 0, 0, 0.5)' : 'none'};
            ">取消</button>
            <button id="confirmBtn" style="
              padding: 8px 16px;
              border: none;
              background: ${isGlass ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : '#3b82f6'};
              color: white;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
              text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
              box-shadow: ${isGlass ? '0 4px 16px rgba(0, 0, 0, 0.2), 0 0 15px rgba(99, 102, 241, 0.3)' : 'none'};
            ">确认导入</button>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);

      const cancelBtn = dialog.querySelector('#cancelBtn');
      const confirmBtn = dialog.querySelector('#confirmBtn');

      const cleanup = () => {
        document.body.removeChild(dialog);
      };

      cancelBtn?.addEventListener('click', () => {
        cleanup();
        resolve(null);
      });

      confirmBtn?.addEventListener('click', () => {
        const selectedMode = dialog.querySelector('input[name="importMode"]:checked') as HTMLInputElement;
        cleanup();
        resolve(selectedMode?.value as 'merge' | 'overwrite');
      });

      // 点击背景关闭
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          cleanup();
          resolve(null);
        }
      });
    });
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

  // 获取导出功能设置
  const getExportSettings = async (): Promise<ExportSettings> => {
    try {
      const allSettings = await apiService.getAllSettings();
      return {
        enabled: allSettings.export_enabled !== 'false' // 默认启用
      };
    } catch (error) {
      console.error('获取导出功能设置失败:', error);
      return { enabled: true };
    }
  };

  // 保存导出功能设置
  const saveExportSettings = async (exportSettings: ExportSettings) => {
    try {
      await apiService.setSetting('export_enabled', exportSettings.enabled.toString());
      setCurrentExportSettings(exportSettings);
      console.log('导出功能设置已保存到数据库');
    } catch (error) {
      console.error('保存导出功能设置失败:', error);
      throw error;
    }
  };

  // 切换导出功能显示
  const toggleExport = async () => {
    try {
      const newSettings = { ...currentExportSettings, enabled: !currentExportSettings.enabled };
      await saveExportSettings(newSettings);
      alert(`导出功能已${newSettings.enabled ? '开启' : '关闭'}！`);
    } catch (error) {
      alert('设置修改失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 获取归纳视图设置
  const getArchiveViewSettings = async (): Promise<ArchiveViewSettings> => {
    try {
      const allSettings = await apiService.getAllSettings();
      return {
        enabled: allSettings.archive_view_enabled !== 'false' // 默认启用
      };
    } catch (error) {
      console.error('获取归纳视图设置失败:', error);
      return { enabled: true };
    }
  };

  // 保存归纳视图设置
  const saveArchiveViewSettings = async (archiveViewSettings: ArchiveViewSettings) => {
    try {
      await apiService.setSetting('archive_view_enabled', archiveViewSettings.enabled.toString());
      setCurrentArchiveViewSettings(archiveViewSettings);
      console.log('归纳视图设置已保存到数据库');
    } catch (error) {
      console.error('保存归纳视图设置失败:', error);
      throw error;
    }
  };

  // 切换归纳视图显示
  const toggleArchiveView = async () => {
    try {
      const newSettings = { ...currentArchiveViewSettings, enabled: !currentArchiveViewSettings.enabled };
      await saveArchiveViewSettings(newSettings);
      alert(`归纳视图已${newSettings.enabled ? '开启' : '关闭'}！`);
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

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
      }}
      onClick={(e) => {
        // 点击背景关闭弹窗
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '1024px',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative',
            zIndex: 100000,
            display: 'block',
            visibility: 'visible',
            opacity: 1,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}
          onClick={(e) => {
            // 防止点击弹窗内容时关闭弹窗
            e.stopPropagation();
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
                      当前密码：{currentPasswordSettings.password}
                    </p>
                  </div>
                )}

              </div>

              {/* 界面设置区域 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold" style={{ color: theme.colors.text }}>
                  界面设置
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

                  {/* 导出功能切换 */}
                  <button
                    onClick={toggleExport}
                    className="flex items-center gap-3 p-4 rounded-lg border transition-colors hover:bg-opacity-80"
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    }}
                  >
                    <Download className="w-5 h-5" style={{ color: theme.colors.primary }} />
                    <div className="text-left">
                      <div className="font-medium">
                        {currentExportSettings.enabled ? '关闭' : '开启'}导出功能
                      </div>
                      <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
                        {currentExportSettings.enabled ? '隐藏导出功能按钮' : '显示导出功能按钮'}
                      </div>
                    </div>
                  </button>

                  {/* 归纳视图切换 */}
                  <button
                    onClick={toggleArchiveView}
                    className="flex items-center gap-3 p-4 rounded-lg border transition-colors hover:bg-opacity-80"
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    }}
                  >
                    <Archive className="w-5 h-5" style={{ color: theme.colors.primary }} />
                    <div className="text-left">
                      <div className="font-medium">
                        {currentArchiveViewSettings.enabled ? '关闭' : '开启'}归纳视图
                      </div>
                      <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
                        {currentArchiveViewSettings.enabled ? '隐藏归纳显示模式' : '显示归纳显示模式'}
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

      {/* 通知组件 */}
      {notification.visible && (
        <NotificationToast
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(prev => ({ ...prev, visible: false }))}
        />
      )}
      </div>
    </div>,
    document.body
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
