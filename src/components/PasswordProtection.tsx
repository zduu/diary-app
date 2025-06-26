import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useThemeContext } from './ThemeProvider';
import { apiService } from '../services/api';

interface PasswordProtectionProps {
  onAuthenticated: () => void;
}

interface PasswordSettings {
  enabled: boolean;
  password: string;
}

interface BackgroundSettings {
  enabled: boolean;
  imageUrl: string;
}

export function PasswordProtection({ onAuthenticated }: PasswordProtectionProps) {
  const { theme } = useThemeContext();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordSettings, setPasswordSettings] = useState<PasswordSettings>({
    enabled: false,
    password: 'diary123'
  });

  const [backgroundSettings, setBackgroundSettings] = useState<BackgroundSettings>({
    enabled: false,
    imageUrl: ''
  });

  // 从后端加载密码设置
  const loadPasswordSettings = async () => {
    try {
      const settings = await apiService.getAllSettings();
      const newPasswordSettings = {
        enabled: settings.app_password_enabled === 'true',
        password: settings.app_password || 'diary123'
      };
      setPasswordSettings(newPasswordSettings);

      const newBackgroundSettings = {
        enabled: settings.login_background_enabled === 'true',
        imageUrl: settings.login_background_url || ''
      };
      setBackgroundSettings(newBackgroundSettings);

      // 如果没有启用密码保护，直接通过验证
      if (!newPasswordSettings.enabled) {
        onAuthenticated();
      }
    } catch (error) {
      console.error('加载密码设置失败:', error);
      // 如果后端加载失败，尝试从localStorage加载
      const localSettings = localStorage.getItem('diary-password-settings');
      if (localSettings) {
        const parsed = JSON.parse(localSettings);
        setPasswordSettings(parsed);
        if (!parsed.enabled) {
          onAuthenticated();
        }
      } else {
        // 默认不启用密码保护
        onAuthenticated();
      }
    }
  };

  // 组件挂载时加载设置
  useEffect(() => {
    loadPasswordSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // 模拟验证延迟
    await new Promise(resolve => setTimeout(resolve, 500));

    if (password === passwordSettings.password) {
      onAuthenticated();
    } else {
      setError('密码错误，请重试');
      setPassword('');
    }

    setIsLoading(false);
  };

  // 如果密码保护未启用，不显示此组件
  if (!passwordSettings.enabled) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4" 
      style={{ 
        zIndex: 9999,
        backgroundColor: backgroundSettings.enabled 
          ? (backgroundSettings.imageUrl ? 'transparent' : '#000000')
          : 'rgba(0, 0, 0, 0.75)',
        backgroundImage: backgroundSettings.enabled && backgroundSettings.imageUrl 
          ? `url(${backgroundSettings.imageUrl})`
          : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* 图片背景的遮罩层 */}
      {backgroundSettings.enabled && backgroundSettings.imageUrl && (
        <div 
          className="absolute inset-0" 
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(2px)'
          }} 
        />
      )}
      
      <div
        className={`w-full max-w-md rounded-xl p-8 ${theme.effects.blur} relative z-10`}
        style={{
          backgroundColor: theme.mode === 'glass' ? undefined : theme.colors.surface,
          border: theme.mode === 'glass' ? undefined : `1px solid ${theme.colors.border}`,
        }}
      >
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              backgroundColor: theme.mode === 'glass' 
                ? 'rgba(255, 255, 255, 0.2)' 
                : `${theme.colors.primary}20`
            }}
          >
            <Lock 
              className="w-8 h-8" 
              style={{ 
                color: theme.mode === 'glass' ? 'white' : theme.colors.primary 
              }} 
            />
          </div>
          <h2 
            className="text-2xl font-bold mb-2"
            style={{ 
              color: theme.mode === 'glass' ? 'white' : theme.colors.text,
              textShadow: theme.mode === 'glass' ? '0 2px 4px rgba(0, 0, 0, 0.3)' : 'none'
            }}
          >
            访问验证
          </h2>
          <p 
            className="text-sm"
            style={{ 
              color: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.8)' : theme.colors.textSecondary,
              textShadow: theme.mode === 'glass' ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none'
            }}
          >
            请输入密码以访问日记应用
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入访问密码"
              className="w-full px-4 py-3 pr-12 rounded-lg border focus:outline-none focus:ring-2 transition-all"
              style={{
                backgroundColor: theme.mode === 'glass' 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : theme.colors.surface,
                borderColor: error 
                  ? '#ef4444' 
                  : (theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.3)' : theme.colors.border),
                color: theme.mode === 'glass' ? 'white' : theme.colors.text,
              }}
              required
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded"
              style={{
                color: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.7)' : theme.colors.textSecondary
              }}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {error && (
            <div 
              className="text-sm text-center p-3 rounded-lg"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !password.trim()}
            className="w-full py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
            {isLoading ? '验证中...' : '进入应用'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p 
            className="text-xs"
            style={{ 
              color: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.6)' : theme.colors.textSecondary,
              textShadow: theme.mode === 'glass' ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none'
            }}
          >
            密码保护可在管理员面板中关闭
          </p>
        </div>
      </div>
    </div>
  );
}
