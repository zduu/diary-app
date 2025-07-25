import React from 'react';
import { useThemeContext } from './ThemeProvider';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// 简单的Markdown解析函数
function parseMarkdown(content: string): string {
  try {
    if (!content || typeof content !== 'string') {
      return '';
    }

    return content
      // 标题
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // 粗体和斜体
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      // 行内代码
      .replace(/`(.*?)`/gim, '<code>$1</code>')
      // 链接
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      // 图片
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" />')
      // 列表项
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      // 引用
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      // 分割线
      .replace(/^---$/gim, '<hr>')
      // 换行
      .replace(/\n/gim, '<br>');
  } catch (error) {
    console.error('Markdown解析失败:', error);
    return content; // 返回原始内容
  }
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const { theme } = useThemeContext();

  try {
    // 安全检查
    if (!content || typeof content !== 'string') {
      return (
        <div
          className={`prose prose-sm max-w-none ${className}`}
          style={{ color: theme.colors.text }}
        >
          <p className="mb-2 leading-relaxed text-gray-400">
            暂无内容
          </p>
        </div>
      );
    }

    // 如果内容包含Markdown语法，则解析；否则直接显示
    const hasMarkdown = /[#*`\[\]>-]/.test(content);

    if (!hasMarkdown) {
      // 纯文本内容，保持换行
      return (
        <div
          className={`prose prose-sm max-w-none ${className}`}
          style={{ color: theme.colors.text }}
        >
          {content.split('\n').map((line, index) => (
            <p key={index} className="mb-2 leading-relaxed">
              {line || '\u00A0'}
            </p>
          ))}
        </div>
      );
    }

    const parsedContent = parseMarkdown(content);

  return (
    <div
      className={`prose prose-sm max-w-none ${className}`}
      style={{
        color: theme.colors.text,
        textShadow: theme.mode === 'glass' ? '0 1px 2px rgba(0, 0, 0, 0.2)' : 'none',
        '--theme-primary': theme.colors.primary,
        '--theme-surface': theme.colors.surface,
        '--theme-border': theme.colors.border,
        '--theme-text-secondary': theme.colors.textSecondary,
      } as React.CSSProperties}
    >
      <style>
        {`
          .prose h1 {
            color: ${theme.colors.text};
            font-size: 1.5rem;
            font-weight: bold;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid ${theme.colors.border};
          }
          .prose h2 {
            color: ${theme.colors.text};
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 0.75rem;
            padding-bottom: 0.25rem;
            border-bottom: 1px solid ${theme.colors.border};
          }
          .prose h3 {
            color: ${theme.colors.text};
            font-size: 1.125rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
          }
          .prose strong {
            color: ${theme.colors.text};
            font-weight: bold;
          }
          .prose em {
            color: ${theme.colors.textSecondary};
            font-style: italic;
          }
          .prose code {
            background-color: ${theme.colors.surface};
            color: ${theme.colors.primary};
            padding: 0.125rem 0.375rem;
            border-radius: 0.25rem;
            font-size: 0.875rem;
            border: 1px solid ${theme.colors.border};
          }
          .prose a {
            color: ${theme.colors.primary};
            text-decoration: underline;
          }
          .prose a:hover {
            text-decoration: none;
          }
          .prose blockquote {
            border-left: 4px solid ${theme.colors.primary};
            padding-left: 1rem;
            margin: 1rem 0;
            font-style: italic;
            background-color: ${theme.colors.primary}15;
            color: ${theme.colors.textSecondary};
            padding: 0.5rem 1rem;
            border-radius: 0 0.5rem 0.5rem 0;
          }
          .prose ul {
            list-style-type: disc;
            margin-left: 1.5rem;
            margin-bottom: 1rem;
          }
          .prose li {
            margin-bottom: 0.25rem;
          }
          .prose hr {
            border: none;
            height: 1px;
            background-color: ${theme.colors.border};
            margin: 1.5rem 0;
          }
          .prose img {
            max-width: 100%;
            height: auto;
            border-radius: 0.5rem;
            margin: 1rem 0;
            border: 1px solid ${theme.colors.border};
          }
        `}
      </style>
      <div dangerouslySetInnerHTML={{ __html: parsedContent }} />
    </div>
  );
  } catch (error) {
    console.error('MarkdownRenderer渲染失败:', error);
    // 降级到纯文本显示
    return (
      <div
        className={`prose prose-sm max-w-none ${className}`}
        style={{ color: theme.colors.text }}
      >
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800 mb-2">
          ⚠️ Markdown渲染失败，显示原始内容
        </div>
        <pre className="whitespace-pre-wrap font-sans">
          {content}
        </pre>
      </div>
    );
  }
}
