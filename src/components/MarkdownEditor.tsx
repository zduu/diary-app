import React, { useState } from 'react';
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

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    
    onChange(newText);
    
    // 重新设置光标位置
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const toolbarButtons = [
    { icon: Bold, action: () => insertMarkdown('**', '**'), title: '粗体' },
    { icon: Italic, action: () => insertMarkdown('*', '*'), title: '斜体' },
    { icon: Type, action: () => insertMarkdown('# '), title: '标题' },
    { icon: List, action: () => insertMarkdown('- '), title: '列表' },
    { icon: Link, action: () => insertMarkdown('[', '](url)'), title: '链接' },
    { icon: Image, action: () => insertMarkdown('![', '](image-url)'), title: '图片' },
    { icon: Code, action: () => insertMarkdown('`', '`'), title: '代码' },
  ];

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
            onClick={() => setMode('edit')}
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
            onClick={() => setMode('preview')}
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
            onClick={() => setMode('split')}
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
          <div
            className="h-96 p-4 rounded-lg border overflow-y-auto"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            }}
          >
            <MarkdownRenderer
              content={value || '*预览区域*\n\n在左侧编辑器中输入 Markdown 内容，这里会实时显示渲染结果。'}
            />
          </div>
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
