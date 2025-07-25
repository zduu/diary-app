import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Eye, Edit, Type, Bold, Italic, List, Link, Image, Code } from 'lucide-react';
import { useThemeContext } from './ThemeProvider';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function MarkdownEditor({ value, onChange, placeholder }: MarkdownEditorProps) {
  const { theme } = useThemeContext();
  const [mode, setMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isComponentMounted, setIsComponentMounted] = useState(false);

  // 组件挂载状态管理
  useEffect(() => {
    setIsComponentMounted(true);
    return () => {
      setIsComponentMounted(false);
    };
  }, []);

  const insertMarkdown = useCallback((before: string, after: string = '') => {
    if (!isComponentMounted) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    try {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end);
      const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);

      onChange(newText);

      // 重新设置光标位置
      setTimeout(() => {
        if (isComponentMounted && textarea) {
          textarea.focus();
          textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
        }
      }, 0);
    } catch (error) {
      console.error('插入Markdown语法失败:', error);
    }
  }, [value, onChange, isComponentMounted]);

  const handleModeChange = useCallback((e: React.MouseEvent, newMode: 'edit' | 'preview' | 'split') => {
    e.preventDefault();
    e.stopPropagation();

    try {
      // 确保组件已挂载
      if (!isComponentMounted) {
        console.warn('组件未挂载，无法切换模式');
        return;
      }

      // 防止重复设置相同模式
      if (mode === newMode) return;

      // 在切换到预览或分屏模式前，确保内容是有效的
      if ((newMode === 'preview' || newMode === 'split') && !value) {
        console.warn('内容为空，无法切换到预览模式');
        return;
      }

      setMode(newMode);
    } catch (error) {
      console.error('切换编辑模式失败:', error);
      // 如果切换失败，保持当前模式
    }
  }, [mode, value, isComponentMounted]);

  const toolbarButtons = [
    { icon: Bold, action: () => insertMarkdown('**', '**'), title: '粗体' },
    { icon: Italic, action: () => insertMarkdown('*', '*'), title: '斜体' },
    { icon: Type, action: () => insertMarkdown('# '), title: '标题' },
    { icon: List, action: () => insertMarkdown('- '), title: '列表' },
    { icon: Link, action: () => insertMarkdown('[', '](url)'), title: '链接' },
    { icon: Image, action: () => insertMarkdown('![', '](image-url)'), title: '图片' },
    { icon: Code, action: () => insertMarkdown('`', '`'), title: '代码' },
  ];

  // 如果组件未挂载，显示加载状态
  if (!isComponentMounted) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center p-8">
          <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
            正在加载编辑器...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {toolbarButtons.map((button, index) => (
            <button
              key={index}
              onClick={button.action}
              className="p-2 rounded hover:bg-opacity-80 transition-colors"
              style={{ 
                backgroundColor: theme.colors.surface,
                color: theme.colors.textSecondary 
              }}
              title={button.title}
            >
              <button.icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        {/* 模式切换 */}
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: theme.colors.surface }}>
          <button
            type="button"
            onClick={(e) => handleModeChange(e, 'edit')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              mode === 'edit' ? 'font-medium' : ''
            }`}
            style={{
              backgroundColor: mode === 'edit' ? theme.colors.primary : 'transparent',
              color: mode === 'edit' ? 'white' : theme.colors.textSecondary,
            }}
          >
            <Edit className="w-4 h-4 inline mr-1" />
            编辑
          </button>
          <button
            type="button"
            onClick={(e) => handleModeChange(e, 'preview')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              mode === 'preview' ? 'font-medium' : ''
            }`}
            style={{
              backgroundColor: mode === 'preview' ? theme.colors.primary : 'transparent',
              color: mode === 'preview' ? 'white' : theme.colors.textSecondary,
            }}
          >
            <Eye className="w-4 h-4 inline mr-1" />
            预览
          </button>
          <button
            type="button"
            onClick={(e) => handleModeChange(e, 'split')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              mode === 'split' ? 'font-medium' : ''
            }`}
            style={{
              backgroundColor: mode === 'split' ? theme.colors.primary : 'transparent',
              color: mode === 'split' ? 'white' : theme.colors.textSecondary,
            }}
          >
            分屏
          </button>
        </div>
      </div>

      {/* 编辑器内容 */}
      <div className={`grid gap-4 ${mode === 'split' ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {/* 编辑区域 */}
        {(mode === 'edit' || mode === 'split') && (
          <div>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder || '开始写作...支持 Markdown 语法'}
              className="w-full h-96 p-4 rounded-lg border resize-none focus:outline-none focus:ring-2 transition-colors"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
                '--tw-ring-color': theme.colors.primary,
              } as React.CSSProperties}
            />
          </div>
        )}

        {/* 预览区域 */}
        {(mode === 'preview' || mode === 'split') && (
          <PreviewArea
            value={value}
            theme={theme}
          />
        )}
      </div>

      {/* Markdown 语法提示 */}
      <details className="text-sm">
        <summary 
          className="cursor-pointer font-medium mb-2"
          style={{ color: theme.colors.textSecondary }}
        >
          Markdown 语法提示
        </summary>
        <div 
          className="grid grid-cols-2 gap-4 p-3 rounded-lg text-xs"
          style={{ 
            backgroundColor: theme.colors.surface,
            color: theme.colors.textSecondary 
          }}
        >
          <div>
            <p><code># 标题</code> - 一级标题</p>
            <p><code>## 标题</code> - 二级标题</p>
            <p><code>**粗体**</code> - 粗体文字</p>
            <p><code>*斜体*</code> - 斜体文字</p>
          </div>
          <div>
            <p><code>- 列表项</code> - 无序列表</p>
            <p><code>[链接](url)</code> - 链接</p>
            <p><code>![图片](url)</code> - 图片</p>
            <p><code>`代码`</code> - 行内代码</p>
          </div>
        </div>
      </details>
    </div>
  );
}

// 独立的预览区域组件，使用React.memo优化性能
const PreviewArea = React.memo(({ value, theme }: { value: string; theme: any }) => {
  const previewContent = value || '*预览区域*\n\n在左侧编辑器中输入 Markdown 内容，这里会实时显示渲染结果。';

  return (
    <div
      className="h-96 p-4 rounded-lg border overflow-y-auto"
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
      }}
    >
      <MarkdownRenderer content={previewContent} />
    </div>
  );
});
