import { useState, useEffect } from 'react';
import { Plus, BookOpen, RefreshCw, Settings, Download } from 'lucide-react';
import { Timeline } from './components/Timeline';
import { DiaryForm } from './components/DiaryForm';
import { AdminPanel, AdminAuthProvider, useAdminAuth } from './components/AdminPanel';
import { PasswordProtection } from './components/PasswordProtection';
import { WelcomePage } from './components/WelcomePage';
import { SearchBar } from './components/SearchBar';
import { QuickFilters } from './components/QuickFilters';
import { ExportModal } from './components/ExportModal';
import { ThemeProvider, useThemeContext } from './components/ThemeProvider';
import { ThemeToggle } from './components/ThemeToggle';

import { ViewModeToggle, ViewMode } from './components/ViewModeToggle';
import { useDiary } from './hooks/useDiary';
import { useExportSettings } from './hooks/useExportSettings';
import { useArchiveViewSettings } from './hooks/useArchiveViewSettings';
import { DiaryEntry } from './types';
import { apiService } from './services/api';
import { StatsTest } from './pages/StatsTest';

function AppContent() {
  const { theme } = useThemeContext();
  const { isAdminAuthenticated } = useAdminAuth();
  const { entries, loading, error, createEntry, updateEntry, refreshEntries } = useDiary();
  const { settings: exportSettings, loading: exportSettingsLoading } = useExportSettings();
  const { settings: archiveViewSettings, loading: archiveViewSettingsLoading } = useArchiveViewSettings();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | undefined>();
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showWelcomePage, setShowWelcomePage] = useState(true);
  const [showPasswordPage, setShowPasswordPage] = useState(false);
  const [showMainApp, setShowMainApp] = useState(false);
  const [isTransitioningToApp, setIsTransitioningToApp] = useState(false);
  const [passwordProtectionEnabled, setPasswordProtectionEnabled] = useState<boolean | null>(null);
  const [searchResults, setSearchResults] = useState<DiaryEntry[] | null>(null);
  const [filterResults, setFilterResults] = useState<DiaryEntry[] | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState<string>('全部日记');
  const [showStatsTest, setShowStatsTest] = useState(false);

  // 从localStorage加载显示模式偏好
  useEffect(() => {
    const savedViewMode = localStorage.getItem('diary_view_mode') as ViewMode;
    if (savedViewMode && (savedViewMode === 'card' || savedViewMode === 'timeline' || savedViewMode === 'archive')) {
      setViewMode(savedViewMode);
    }
  }, []);

  // 当归纳视图被禁用时，自动切换到卡片模式
  useEffect(() => {
    if (!archiveViewSettingsLoading && !archiveViewSettings.enabled && viewMode === 'archive') {
      setViewMode('card');
      localStorage.setItem('diary_view_mode', 'card');
    }
  }, [archiveViewSettings.enabled, archiveViewSettingsLoading, viewMode]);

  // 检测密码保护是否启用
  useEffect(() => {
    const checkPasswordProtection = async () => {
      try {
        // 使用apiService来获取设置，这样会自动处理API失败的情况
        const settings = await apiService.getAllSettings();
        const isEnabled = settings.app_password_enabled === 'true';
        setPasswordProtectionEnabled(isEnabled);

        // 如果密码保护未启用，设置为已认证，但仍显示欢迎页面
        if (!isEnabled) {
          setIsAuthenticated(true);
        }
        // 无论是否有密码保护，都先显示欢迎页面
        setShowWelcomePage(true);
      } catch (error) {
        console.error('检查密码保护设置失败:', error);
        // 出错时检查localStorage中的设置
        const localSettings = localStorage.getItem('diary-password-settings');
        if (localSettings) {
          try {
            const parsed = JSON.parse(localSettings);
            const isEnabled = parsed.enabled === true;
            setPasswordProtectionEnabled(isEnabled);

            if (!isEnabled) {
              setIsAuthenticated(true);
            }
            // 无论是否有密码保护，都先显示欢迎页面
            setShowWelcomePage(true);
          } catch (parseError) {
            console.error('解析本地密码设置失败:', parseError);
            // 解析失败时默认不启用密码保护
            setPasswordProtectionEnabled(false);
            setIsAuthenticated(true);
            setShowWelcomePage(true);
          }
        } else {
          // 没有本地设置时默认不启用密码保护，直接进入应用
          setPasswordProtectionEnabled(false);
          setIsAuthenticated(true);
          setShowWelcomePage(true);
        }
      }
    };

    checkPasswordProtection();
  }, []);

  // 调试信息
  useEffect(() => {
    console.log('App状态:', {
      passwordProtectionEnabled,
      isAuthenticated,
      showWelcomePage
    });
  }, [passwordProtectionEnabled, isAuthenticated, showWelcomePage]);

  // 测试功能：添加键盘快捷键来切换密码保护
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl+Shift+P 切换密码保护
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        const currentSettings = localStorage.getItem('diary-password-settings');
        let newSettings;

        if (currentSettings) {
          try {
            const parsed = JSON.parse(currentSettings);
            newSettings = {
              enabled: !parsed.enabled,
              password: parsed.password || 'diary123'
            };
          } catch {
            newSettings = { enabled: true, password: 'diary123' };
          }
        } else {
          newSettings = { enabled: true, password: 'diary123' };
        }

        localStorage.setItem('diary-password-settings', JSON.stringify(newSettings));

        // 重新加载页面以应用新设置
        window.location.reload();

        console.log(`密码保护已${newSettings.enabled ? '启用' : '禁用'}，密码: ${newSettings.password}`);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // 保存显示模式偏好到localStorage
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('diary_view_mode', mode);
  };
  const [isSearching, setIsSearching] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);

  const handleSave = async (entryData: Omit<DiaryEntry, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (editingEntry) {
        await updateEntry(editingEntry.id!, entryData);
      } else {
        await createEntry(entryData);
      }
      // 先关闭对话框，然后清理状态
      setIsFormOpen(false);
      // 延迟清理editingEntry，给组件时间完成清理
      setTimeout(() => {
        setEditingEntry(undefined);
      }, 100);
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleEdit = (entry: DiaryEntry) => {
    setEditingEntry(entry);
    setIsFormOpen(true);
  };



  const handleCancel = () => {
    // 先关闭对话框，然后清理状态
    setIsFormOpen(false);
    // 延迟清理editingEntry，给组件时间完成清理
    setTimeout(() => {
      setEditingEntry(undefined);
    }, 100);
  };

  const handleSearchResults = (results: DiaryEntry[]) => {
    setSearchResults(results);
    setIsSearching(true);
    // 清除过滤结果，避免冲突
    setFilterResults(null);
    setIsFiltering(false);
  };

  const handleClearSearch = () => {
    setSearchResults(null);
    setIsSearching(false);
  };

  const handleFilterResults = (results: DiaryEntry[]) => {
    setFilterResults(results);
    setIsFiltering(true);
    // 清除搜索结果，避免冲突
    setSearchResults(null);
    setIsSearching(false);
  };

  const handleClearFilter = () => {
    setFilterResults(null);
    setIsFiltering(false);
  };

  const handleNewEntry = () => {
    setEditingEntry(undefined);
    setIsFormOpen(true);
  };

  // 打开导出模态框
  const handleOpenExportModal = () => {
    // 确定导出类型
    let type = '全部日记';
    if (searchResults) {
      type = '搜索结果';
    } else if (filterResults) {
      type = '筛选结果';
    }

    setExportType(type);
    setIsExportModalOpen(true);
  };

  // 如果密码保护状态还未确定，显示加载状态
  if (passwordProtectionEnabled === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>正在加载...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 欢迎页面 - 始终首先显示，密码保护时作为背景保持可见 */}
      {(showWelcomePage || showPasswordPage) && !showMainApp && (
        <WelcomePage
          hasPasswordProtection={passwordProtectionEnabled}
          isBackground={showPasswordPage} // 当显示密码页面时，欢迎页面作为背景
          isTransitioningToApp={isTransitioningToApp} // 传递过渡状态
          onEnterApp={() => {
            if (passwordProtectionEnabled && !isAuthenticated) {
              setShowPasswordPage(true);
              // 不隐藏欢迎页面，让它作为背景
            } else {
              // 开始平缓的过渡到主应用
              setIsTransitioningToApp(true);
              setTimeout(() => {
                setShowWelcomePage(false);
                setShowMainApp(true);
                // 延迟一点再停止过渡状态，确保动画完成
                setTimeout(() => {
                  setIsTransitioningToApp(false);
                }, 800);
              }, 600); // 600ms后开始显示主应用
            }
          }}
        />
      )}

      {/* 密码保护页面 - 在欢迎页面之上显示，背景是透明的 */}
      {showPasswordPage && passwordProtectionEnabled && !isAuthenticated && !showMainApp && (
        <PasswordProtection onAuthenticated={() => {
          setIsAuthenticated(true);
          setShowPasswordPage(false);
          // 开始平缓的过渡到主应用
          setIsTransitioningToApp(true);
          setTimeout(() => {
            setShowWelcomePage(false);
            setShowMainApp(true);
            // 延迟一点再停止过渡状态，确保动画完成
            setTimeout(() => {
              setIsTransitioningToApp(false);
            }, 800);
          }, 600); // 600ms后开始显示主应用
        }} />
      )}

      <div
        className={`app-transition ${
          theme.mode === 'glass' ? 'blog-guide-gradient' : ''
        } ${
          // 显示主应用时才显示，否则隐藏
          showMainApp ? 'opacity-100' : 'opacity-0 pointer-events-none'
        } ${
          // 添加淡入动画类
          isTransitioningToApp ? 'main-app-enter' : ''
        }`}
        style={{
          backgroundColor: theme.mode === 'glass' ? 'transparent' : theme.colors.background,
          transform: showMainApp ? 'scale(1)' : 'scale(0.95)',
          filter: showMainApp ? 'blur(0px) brightness(1)' : 'blur(3px) brightness(0.8)',
          transition: isTransitioningToApp
            ? 'all 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            : 'all 0.3s ease',
          // 当不显示主应用时，完全移除对布局的影响
          display: showMainApp ? 'block' : 'none'
        }}
      >
      {/* Header */}
      <header
        className={`shadow-lg border-b ${theme.effects.blur}`}
        style={{
          backgroundColor: theme.mode === 'glass' ? undefined : theme.colors.surface,
          borderBottomColor: theme.mode === 'glass' ? undefined : theme.colors.border,
        }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 md:py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 md:gap-4">
              <div
                className="p-1.5 md:p-2 rounded-lg md:rounded-xl"
                style={{
                  backgroundColor: theme.mode === 'glass'
                    ? 'rgba(255, 255, 255, 0.2)'
                    : `${theme.colors.primary}20`
                }}
              >
                <BookOpen
                  className="w-6 h-6 md:w-8 md:h-8"
                  style={{
                    color: theme.mode === 'glass' ? 'white' : theme.colors.primary
                  }}
                />
              </div>
              <div className="min-w-0">
                <h1
                  className={`text-xl md:text-3xl font-bold ${theme.mode === 'glass' ? 'text-white' : ''}`}
                  style={{
                    color: theme.mode === 'glass' ? 'white' : theme.colors.text,
                    textShadow: theme.mode === 'glass' ? '0 4px 8px rgba(0, 0, 0, 0.3)' : 'none'
                  }}
                >
                  我的日记
                </h1>
                <p
                  className={`text-xs md:text-sm ${theme.mode === 'glass' ? 'text-white' : ''} hidden sm:block`}
                  style={{
                    color: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.8)' : theme.colors.textSecondary,
                    textShadow: theme.mode === 'glass' ? '0 2px 4px rgba(0, 0, 0, 0.3)' : 'none'
                  }}
                >
                  记录生活，留住美好
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 md:gap-3">
              <div className="hidden md:block">
                <ThemeToggle />
              </div>

              <button
                onClick={() => setIsAdminPanelOpen(true)}
                className="p-2 md:p-3 rounded-full transition-all duration-200 hover:scale-110"
                style={{
                  backgroundColor: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.2)' : theme.colors.surface,
                  color: theme.mode === 'glass' ? 'white' : theme.colors.textSecondary,
                  border: theme.mode === 'glass' ? '1px solid rgba(255, 255, 255, 0.3)' : `1px solid ${theme.colors.border}`
                }}
                title="管理员面板"
              >
                <Settings className="w-4 h-4 md:w-5 md:h-5" />
              </button>

              {/* 统计测试按钮 - 仅在开发环境显示 */}
              {import.meta.env.DEV && (
                <button
                  onClick={() => setShowStatsTest(!showStatsTest)}
                  className="p-2 md:p-3 rounded-full transition-all duration-200 hover:scale-110"
                  style={{
                    backgroundColor: showStatsTest ? theme.colors.primary : (theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.2)' : theme.colors.surface),
                    color: showStatsTest ? 'white' : (theme.mode === 'glass' ? 'white' : theme.colors.textSecondary),
                    border: theme.mode === 'glass' ? '1px solid rgba(255, 255, 255, 0.3)' : `1px solid ${theme.colors.border}`
                  }}
                  title="统计API测试"
                >
                  📊
                </button>
              )}

              <button
                onClick={refreshEntries}
                disabled={loading}
                className="p-2 md:p-3 rounded-full transition-all duration-200 hover:scale-110 disabled:opacity-50"
                style={{
                  backgroundColor: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.2)' : theme.colors.surface,
                  color: theme.mode === 'glass' ? 'white' : theme.colors.textSecondary,
                  border: theme.mode === 'glass' ? '1px solid rgba(255, 255, 255, 0.3)' : `1px solid ${theme.colors.border}`
                }}
                title="刷新"
              >
                <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {isAdminAuthenticated && (
                <button
                  onClick={handleNewEntry}
                  className="flex items-center gap-1 md:gap-2 px-3 py-2 md:px-6 md:py-3 rounded-lg md:rounded-xl font-bold transition-all duration-200 hover:scale-105 shadow-lg"
                  style={{
                    background: theme.mode === 'glass'
                      ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.9) 0%, rgba(139, 92, 246, 0.9) 100%)'
                      : theme.colors.primary,
                    color: 'white',
                    border: theme.mode === 'glass' ? '1px solid rgba(255, 255, 255, 0.3)' : 'none',
                    backdropFilter: theme.mode === 'glass' ? 'blur(10px)' : 'none',
                    boxShadow: theme.mode === 'glass'
                      ? '0 8px 32px rgba(168, 85, 247, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                      : undefined,
                    textShadow: theme.mode === 'glass' ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none'
                  }}
                >
                  <Plus className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="text-sm md:text-base">写日记</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Theme Toggle */}
      <div className="md:hidden fixed bottom-4 left-4 z-40">
        <ThemeToggle />
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-4 md:py-8">
        {error && (
          <div
            className="mb-6 p-4 rounded-xl border"
            style={{
              backgroundColor: `${theme.colors.accent}20`,
              borderColor: theme.colors.accent,
              color: theme.colors.text
            }}
          >
            <p>{error}</p>
            <button
              onClick={refreshEntries}
              className="mt-2 underline hover:no-underline transition-colors"
              style={{ color: theme.colors.accent }}
            >
              重试
            </button>
          </div>
        )}

        {loading && entries.length === 0 ? (
          <div className="flex justify-center items-center py-16">
            <div className="text-center">
              <RefreshCw
                className="w-12 h-12 animate-spin mx-auto mb-4"
                style={{ color: theme.colors.primary }}
              />
              <p
                className="text-lg"
                style={{ color: theme.colors.textSecondary }}
              >
                加载中...
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 搜索栏和显示模式切换 */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 w-full sm:w-auto">
                <SearchBar
                  entries={entries}
                  onSearchResults={handleSearchResults}
                  onClearSearch={handleClearSearch}
                />
              </div>
              <ViewModeToggle
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
              />
            </div>

            {/* 快速过滤 */}
            <QuickFilters
              entries={entries}
              onFilterResults={handleFilterResults}
              onClearFilter={handleClearFilter}
            />

            {/* 搜索结果提示 */}
            {isSearching && (
              <div className="flex items-center justify-between p-3 rounded-lg" style={{
                backgroundColor: theme.mode === 'glass'
                  ? 'rgba(255, 255, 255, 0.1)'
                  : theme.colors.surface,
                border: `1px solid ${theme.colors.border}`,
                color: theme.colors.text
              }}>
                <span>
                  {searchResults && searchResults.length > 0
                    ? `找到 ${searchResults.length} 条匹配的日记`
                    : '没有找到匹配的日记'
                  }
                </span>
                {isAdminAuthenticated && !exportSettingsLoading && exportSettings.enabled && searchResults && searchResults.length > 0 && (
                  <button
                    onClick={handleOpenExportModal}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm"
                    style={{
                      backgroundColor: theme.colors.primary,
                      color: 'white'
                    }}
                  >
                    <Download className="w-4 h-4" />
                    导出搜索结果
                  </button>
                )}
              </div>
            )}

            {/* 过滤结果提示 */}
            {isFiltering && (
              <div className="flex items-center justify-between p-3 rounded-lg" style={{
                backgroundColor: theme.mode === 'glass'
                  ? 'rgba(255, 255, 255, 0.1)'
                  : theme.colors.surface,
                border: `1px solid ${theme.colors.border}`,
                color: theme.colors.text
              }}>
                <span>
                  {filterResults && filterResults.length > 0
                    ? `筛选出 ${filterResults.length} 条日记`
                    : '没有符合条件的日记'
                  }
                </span>
                {isAdminAuthenticated && !exportSettingsLoading && exportSettings.enabled && filterResults && filterResults.length > 0 && (
                  <button
                    onClick={handleOpenExportModal}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm"
                    style={{
                      backgroundColor: theme.colors.primary,
                      color: 'white'
                    }}
                  >
                    <Download className="w-4 h-4" />
                    导出筛选结果
                  </button>
                )}
              </div>
            )}

            {/* 导出全部日记按钮 - 只在没有搜索或筛选时显示 */}
            {isAdminAuthenticated && !exportSettingsLoading && exportSettings.enabled && !isSearching && !isFiltering && entries.length > 0 && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleOpenExportModal}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: theme.mode === 'glass'
                      ? 'rgba(255, 255, 255, 0.1)'
                      : theme.colors.surface,
                    border: `1px solid ${theme.colors.border}`,
                    color: theme.colors.text
                  }}
                >
                  <Download className="w-4 h-4" />
                  导出全部日记
                </button>
              </div>
            )}

            {/* 统计测试页面 */}
            {showStatsTest ? (
              <StatsTest />
            ) : (
              <Timeline
                entries={searchResults || filterResults || entries}
                onEdit={handleEdit}
                viewMode={viewMode}
              />
            )}
          </div>
        )}
      </main>

      {/* Form Modal */}
      <DiaryForm
        key={`diary-form-${editingEntry?.id || 'new'}-${isFormOpen}`}
        entry={editingEntry}
        onSave={handleSave}
        onCancel={handleCancel}
        isOpen={isFormOpen}
      />

      {/* Admin Panel */}
      <AdminPanel
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        entries={entries}
        onEntriesUpdate={refreshEntries}
        onEdit={handleEdit}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        entries={searchResults || filterResults || entries}
        exportType={exportType}
      />


      </div>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AdminAuthProvider>
        <AppContent />
      </AdminAuthProvider>
    </ThemeProvider>
  );
}

export default App;
