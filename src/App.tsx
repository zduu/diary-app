import { useState, useEffect } from 'react';
import { Plus, BookOpen, RefreshCw, Settings } from 'lucide-react';
import { Timeline } from './components/Timeline';
import { DiaryForm } from './components/DiaryForm';
import { AdminPanel, AdminAuthProvider, useAdminAuth } from './components/AdminPanel';
import { PasswordProtection } from './components/PasswordProtection';
import { SearchBar } from './components/SearchBar';
import { QuickFilters } from './components/QuickFilters';
import { ThemeProvider, useThemeContext } from './components/ThemeProvider';
import { ThemeToggle } from './components/ThemeToggle';
import { DevTools } from './components/DevTools';
import { ViewModeToggle, ViewMode } from './components/ViewModeToggle';
import { useDiary } from './hooks/useDiary';
import { DiaryEntry } from './types';

function AppContent() {
  const { theme } = useThemeContext();
  const { isAdminAuthenticated } = useAdminAuth();
  const { entries, loading, error, createEntry, updateEntry, refreshEntries } = useDiary();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | undefined>();
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchResults, setSearchResults] = useState<DiaryEntry[] | null>(null);
  const [filterResults, setFilterResults] = useState<DiaryEntry[] | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('card');

  // 从localStorage加载显示模式偏好
  useEffect(() => {
    const savedViewMode = localStorage.getItem('diary_view_mode') as ViewMode;
    if (savedViewMode && (savedViewMode === 'card' || savedViewMode === 'timeline')) {
      setViewMode(savedViewMode);
    }
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
      setIsFormOpen(false);
      setEditingEntry(undefined);
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleEdit = (entry: DiaryEntry) => {
    setEditingEntry(entry);
    setIsFormOpen(true);
  };



  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingEntry(undefined);
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

  return (
    <>
      {/* 密码保护 */}
      {!isAuthenticated && (
        <PasswordProtection onAuthenticated={() => setIsAuthenticated(true)} />
      )}

      <div
        className={`min-h-screen transition-all duration-300 ${
          theme.mode === 'glass' ? 'blog-guide-gradient' : ''
        }`}
        style={{
          backgroundColor: theme.mode === 'glass' ? 'transparent' : theme.colors.background
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
              <div className="p-3 rounded-lg" style={{
                backgroundColor: theme.mode === 'glass'
                  ? 'rgba(255, 255, 255, 0.1)'
                  : theme.colors.surface,
                border: `1px solid ${theme.colors.border}`,
                color: theme.colors.text
              }}>
                {searchResults && searchResults.length > 0
                  ? `找到 ${searchResults.length} 条匹配的日记`
                  : '没有找到匹配的日记'
                }
              </div>
            )}

            {/* 过滤结果提示 */}
            {isFiltering && (
              <div className="p-3 rounded-lg" style={{
                backgroundColor: theme.mode === 'glass'
                  ? 'rgba(255, 255, 255, 0.1)'
                  : theme.colors.surface,
                border: `1px solid ${theme.colors.border}`,
                color: theme.colors.text
              }}>
                {filterResults && filterResults.length > 0
                  ? `筛选出 ${filterResults.length} 条日记`
                  : '没有符合条件的日记'
                }
              </div>
            )}

            <Timeline
              entries={searchResults || filterResults || entries}
              onEdit={handleEdit}
              viewMode={viewMode}
            />
          </div>
        )}
      </main>

      {/* Form Modal */}
      <DiaryForm
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

      {/* Dev Tools */}
      <DevTools />
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
