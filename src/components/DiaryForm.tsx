import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { DiaryEntry, MoodType, WeatherType } from '../types';
import { MarkdownEditor } from './MarkdownEditor';
import { ImageUpload } from './ImageUpload';
import { useThemeContext } from './ThemeProvider';

interface DiaryFormProps {
  entry?: DiaryEntry;
  onSave: (entry: Omit<DiaryEntry, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
  isOpen: boolean;
}

const moods: { value: MoodType; label: string; emoji: string }[] = [
  { value: 'happy', label: '开心', emoji: '😊' },
  { value: 'sad', label: '难过', emoji: '😢' },
  { value: 'neutral', label: '平静', emoji: '😐' },
  { value: 'excited', label: '兴奋', emoji: '🤩' },
  { value: 'anxious', label: '焦虑', emoji: '😰' },
  { value: 'peaceful', label: '宁静', emoji: '😌' },
];

const weathers: { value: WeatherType; label: string }[] = [
  { value: 'sunny', label: '晴天' },
  { value: 'cloudy', label: '多云' },
  { value: 'rainy', label: '雨天' },
  { value: 'snowy', label: '雪天' },
  { value: 'unknown', label: '未知' },
];

export function DiaryForm({ entry, onSave, onCancel, isOpen }: DiaryFormProps) {
  const { theme } = useThemeContext();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState<'markdown' | 'plain'>('markdown');
  const [mood, setMood] = useState<MoodType>('neutral');
  const [weather, setWeather] = useState<WeatherType>('unknown');
  const [images, setImages] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (entry) {
      setTitle(entry.title);
      setContent(entry.content);
      setContentType((entry.content_type as 'markdown' | 'plain') || 'markdown');
      setMood((entry.mood as MoodType) || 'neutral');
      setWeather((entry.weather as WeatherType) || 'unknown');
      setImages(entry.images || []);
      setTags(entry.tags || []);
    } else {
      setTitle('');
      setContent('');
      setContentType('markdown');
      setMood('neutral');
      setWeather('unknown');
      setImages([]);
      setTags([]);
    }
    setTagInput('');
  }, [entry, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      await onSave({
        title: title.trim() || '无标题',
        content: content.trim(),
        content_type: contentType,
        mood,
        weather,
        images,
        tags,
      });
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div
        className={`rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto ${theme.effects.blur}`}
        style={{ backgroundColor: theme.colors.background }}
      >
        <div
          className="flex justify-between items-center p-6"
          style={{ borderBottom: `1px solid ${theme.colors.border}` }}
        >
          <h2
            className="text-2xl font-bold"
            style={{ color: theme.colors.text }}
          >
            {entry ? '✏️ 编辑日记' : '📝 写新日记'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 rounded-full transition-all duration-200 hover:scale-110"
            style={{
              backgroundColor: theme.colors.surface,
              color: theme.colors.textSecondary
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title - Optional */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: theme.colors.text }}
            >
              📝 标题 <span className="text-xs opacity-60">(可选)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all duration-200"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
                '--tw-ring-color': theme.colors.primary,
              } as React.CSSProperties}
              placeholder="为这篇日记起个标题吧..."
            />
          </div>

          {/* Content Type Toggle */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: theme.colors.text }}
            >
              ✍️ 内容格式
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setContentType('markdown')}
                className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                  contentType === 'markdown' ? 'font-medium' : ''
                }`}
                style={{
                  backgroundColor: contentType === 'markdown' ? theme.colors.primary : theme.colors.surface,
                  color: contentType === 'markdown' ? 'white' : theme.colors.textSecondary,
                  border: `1px solid ${theme.colors.border}`
                }}
              >
                Markdown
              </button>
              <button
                type="button"
                onClick={() => setContentType('plain')}
                className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                  contentType === 'plain' ? 'font-medium' : ''
                }`}
                style={{
                  backgroundColor: contentType === 'plain' ? theme.colors.primary : theme.colors.surface,
                  color: contentType === 'plain' ? 'white' : theme.colors.textSecondary,
                  border: `1px solid ${theme.colors.border}`
                }}
              >
                纯文本
              </button>
            </div>
          </div>

          {/* Content */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: theme.colors.text }}
            >
              📄 内容
            </label>
            {contentType === 'markdown' ? (
              <MarkdownEditor
                value={content}
                onChange={setContent}
                placeholder="使用 Markdown 语法记录你的想法和感受..."
              />
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                className="w-full px-4 py-3 rounded-lg border resize-none focus:outline-none focus:ring-2 transition-all duration-200"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                  '--tw-ring-color': theme.colors.primary,
                } as React.CSSProperties}
                placeholder="详细记录你的想法和感受..."
                required
              />
            )}
          </div>

          {/* Images */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: theme.colors.text }}
            >
              🖼️ 图片
            </label>
            <ImageUpload
              images={images}
              onImagesChange={setImages}
              maxImages={5}
            />
          </div>

          {/* Mood and Weather */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                心情
              </label>
              <select
                value={mood}
                onChange={(e) => setMood(e.target.value as MoodType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {moods.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.emoji} {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                天气
              </label>
              <select
                value={weather}
                onChange={(e) => setWeather(e.target.value as WeatherType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {weathers.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              标签
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleTagKeyPress}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="添加标签..."
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                添加
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full flex items-center gap-1"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="px-6 py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 hover:scale-105"
              style={{
                backgroundColor: theme.colors.primary,
                color: 'white'
              }}
            >
              <Save className="w-5 h-5" />
              {loading ? '保存中...' : '保存日记'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
