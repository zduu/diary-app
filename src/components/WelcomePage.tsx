import { useState, useEffect } from 'react';
import { BookOpen, Heart, Calendar, MapPin, Cloud, Sparkles, Lock, Palette } from 'lucide-react';
import { useThemeContext } from './ThemeProvider';

interface WelcomePageProps {
  onEnterApp?: () => void;
  hasPasswordProtection?: boolean;
  isBackground?: boolean; // 是否作为密码保护的背景
  isTransitioningToApp?: boolean; // 是否正在过渡到主应用
}

export function WelcomePage({ onEnterApp, hasPasswordProtection, isBackground, isTransitioningToApp }: WelcomePageProps) {
  const { theme } = useThemeContext();
  
  // 简单的移动设备检测
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);



  const features = [
    {
      icon: BookOpen,
      title: '记录生活',
      description: '用文字记录每一个珍贵的时刻，让回忆永远鲜活'
    },
    {
      icon: Heart,
      title: '心情追踪',
      description: '记录每天的心情变化，了解自己的情感轨迹'
    },
    {
      icon: Calendar,
      title: '时间轴',
      description: '按时间顺序浏览所有日记，重温美好时光'
    },
    {
      icon: MapPin,
      title: '位置记录',
      description: '记录每篇日记的地理位置，让回忆更加生动'
    },
    {
      icon: Cloud,
      title: '天气记录',
      description: '记录当时的天气情况，为回忆增添更多细节'
    },
    {
      icon: Sparkles,
      title: '多媒体',
      description: '支持图片上传，让日记内容更加丰富多彩'
    }
  ];

  // 计算过渡状态
  const isInTransition = isTransitioningToApp;

  // 根据不同的过渡状态计算样式
  let opacity = 1;
  let scale = 1;
  let blur = 0;
  let brightness = 1;

  if (isTransitioningToApp) {
    // 过渡到主应用时的效果 - 更加轻柔
    opacity = 0.3;
    scale = 0.97;
    blur = 2;
    brightness = 0.85;
  }

  return (
    <div
      className={`welcome-page transition-all duration-1000 ${
        theme.mode === 'glass' ? 'blog-guide-gradient' : ''
      } ${isInTransition || isBackground ? 'pointer-events-none' : ''}`}
      style={{
        backgroundColor: theme.mode === 'glass' ? 'transparent' : theme.colors.background,
        opacity: isBackground ? 1 : opacity, // 作为背景时保持完全可见
        transform: isBackground ? 'scale(1)' : `scale(${scale})`, // 作为背景时不缩放
        filter: isBackground
          ? 'blur(0px) brightness(1)' // 作为背景时不模糊
          : `blur(${blur}px) brightness(${brightness})`,
        transition: isInTransition
          ? 'all 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          : 'all 0.3s ease',
        zIndex: isBackground ? 1 : 10 // 作为背景时降低层级
      }}
    >
      {/* 装饰性背景 */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {theme.mode === 'glass' ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 animate-pulse" />
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
            <div className="absolute top-3/4 left-1/3 w-32 h-32 bg-pink-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />
          </>
        ) : (
          <>
            {/* 其他主题的装饰背景 */}
            <div className="absolute top-10 left-10 w-32 h-32 rounded-full blur-3xl animate-float opacity-20" 
                 style={{ backgroundColor: theme.colors.primary }} />
            <div className="absolute bottom-20 right-20 w-24 h-24 rounded-full blur-3xl animate-float opacity-20" 
                 style={{ backgroundColor: theme.colors.accent, animationDelay: '3s' }} />
            <div className="absolute top-1/2 left-20 w-16 h-16 rounded-full blur-2xl animate-float opacity-30" 
                 style={{ backgroundColor: theme.colors.primary, animationDelay: '1.5s' }} />
          </>
        )}
      </div>

      <div className="relative z-10">
        {/* 头部导航 */}
        <header className={`${theme.effects.blur} border-b`}
          style={{
            backgroundColor: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.1)' : theme.colors.surface,
            borderBottomColor: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.2)' : theme.colors.border,
          }}
        >
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: theme.mode === 'glass' 
                      ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))'
                      : theme.colors.primary
                  }}
                >
                  <BookOpen 
                    className="w-6 h-6" 
                    style={{ color: theme.mode === 'glass' ? 'white' : 'white' }} 
                  />
                </div>
                <h1 
                  className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}
                  style={{ 
                    color: theme.mode === 'glass' ? 'white' : theme.colors.text,
                    textShadow: theme.mode === 'glass' ? '0 2px 4px rgba(0, 0, 0, 0.3)' : 'none'
                  }}
                >
                  我的日记本
                </h1>
              </div>
              
              <div className="flex items-center gap-2">
                {hasPasswordProtection && (
                  <>
                    <Lock 
                      className="w-5 h-5" 
                      style={{ 
                        color: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.8)' : theme.colors.textSecondary 
                      }} 
                    />
                    <span 
                      className="text-sm"
                      style={{ 
                        color: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.8)' : theme.colors.textSecondary 
                      }}
                    >
                      需要密码访问
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* 主要内容 */}
        <main className="max-w-6xl mx-auto px-4 py-4">
          {/* 欢迎区域 */}
          <div className="text-center mb-8 animate-fadeInUp">
            <div className={`${isMobile ? 'text-6xl' : 'text-8xl'} mb-6 animate-bounce`}>
              📖
            </div>
            <h2 
              className={`welcome-hero-title font-bold mb-4 welcome-gradient-text ${isMobile ? 'text-3xl' : 'text-5xl'}`}
              style={{ 
                color: theme.mode === 'glass' ? 'white' : theme.colors.text,
                textShadow: theme.mode === 'glass' ? '0 2px 4px rgba(0, 0, 0, 0.3)' : 'none'
              }}
            >
              欢迎来到我的日记世界
            </h2>
            <p 
              className={`welcome-hero-subtitle max-w-2xl mx-auto leading-relaxed animate-slideInLeft ${isMobile ? 'text-lg' : 'text-xl'}`}
              style={{ 
                color: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.9)' : theme.colors.textSecondary,
                textShadow: theme.mode === 'glass' ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none',
                animationDelay: '0.3s'
              }}
            >
              这里是一个私人的数字日记空间，记录生活中的点点滴滴，
              保存珍贵的回忆，追踪心情变化，让每一天都变得有意义。
            </p>
            
            {/* 装饰性元素 */}
            <div className="flex justify-center items-center gap-4 mt-8 animate-slideInRight" style={{ animationDelay: '0.6s' }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme.colors.primary }} />
              <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: theme.colors.accent, animationDelay: '0.5s' }} />
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme.colors.primary, animationDelay: '1s' }} />
            </div>
          </div>

          {/* 统计信息 */}
          <div className="mb-8">
            <div className={`welcome-stats-grid grid gap-6 mb-8 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
              {[
                { number: '365', label: '天记录', icon: '📅' },
                { number: '∞', label: '无限回忆', icon: '💭' },
                { number: '24/7', label: '随时记录', icon: '⏰' },
                { number: '100%', label: '私密安全', icon: '🔒' }
              ].map((stat, index) => (
                <div
                  key={index}
                  className={`text-center p-6 rounded-xl ${theme.effects.blur} animate-fadeInUp`}
                  style={{
                    backgroundColor: theme.mode === 'glass' 
                      ? 'rgba(255, 255, 255, 0.1)' 
                      : theme.colors.surface,
                    border: theme.mode === 'glass' 
                      ? '1px solid rgba(255, 255, 255, 0.2)' 
                      : `1px solid ${theme.colors.border}`,
                    animationDelay: `${index * 0.1}s`
                  }}
                >
                  <div className="text-2xl mb-2">{stat.icon}</div>
                  <div 
                    className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold mb-1`}
                    style={{ 
                      color: theme.mode === 'glass' ? 'white' : theme.colors.primary,
                      textShadow: theme.mode === 'glass' ? '0 2px 4px rgba(0, 0, 0, 0.3)' : 'none'
                    }}
                  >
                    {stat.number}
                  </div>
                  <div 
                    className="text-sm"
                    style={{ 
                      color: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.8)' : theme.colors.textSecondary,
                      textShadow: theme.mode === 'glass' ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none'
                    }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 功能特色 */}
          <div className="mb-8">
            <h3 
              className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-center mb-6`}
              style={{ 
                color: theme.mode === 'glass' ? 'white' : theme.colors.text,
                textShadow: theme.mode === 'glass' ? '0 2px 4px rgba(0, 0, 0, 0.3)' : 'none'
              }}
            >
              ✨ 功能特色
            </h3>
            <div className={`welcome-feature-grid grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}>
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`welcome-feature-card p-6 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl ${theme.effects.blur} animate-fadeInUp`}
                  style={{
                    backgroundColor: theme.mode === 'glass' 
                      ? 'rgba(255, 255, 255, 0.1)' 
                      : theme.colors.surface,
                    border: theme.mode === 'glass' 
                      ? '1px solid rgba(255, 255, 255, 0.2)' 
                      : `1px solid ${theme.colors.border}`,
                    backdropFilter: theme.mode === 'glass' ? 'blur(10px)' : 'none',
                    animationDelay: `${index * 0.1}s`
                  }}
                >
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                    style={{
                      background: theme.mode === 'glass'
                        ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))'
                        : `${theme.colors.primary}20`
                    }}
                  >
                    <feature.icon 
                      className="w-6 h-6" 
                      style={{ 
                        color: theme.mode === 'glass' ? 'white' : theme.colors.primary 
                      }} 
                    />
                  </div>
                  <h4 
                    className="text-lg font-semibold mb-2"
                    style={{ 
                      color: theme.mode === 'glass' ? 'white' : theme.colors.text,
                      textShadow: theme.mode === 'glass' ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none'
                    }}
                  >
                    {feature.title}
                  </h4>
                  <p 
                    className="text-sm leading-relaxed"
                    style={{ 
                      color: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.8)' : theme.colors.textSecondary,
                      textShadow: theme.mode === 'glass' ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none'
                    }}
                  >
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 进入应用区域 */}
          <div className="text-center animate-fadeInUp" style={{ animationDelay: '0.8s' }}>
            <h3 
              className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold mb-8`}
              style={{ 
                color: theme.mode === 'glass' ? 'white' : theme.colors.text,
                textShadow: theme.mode === 'glass' ? '0 2px 4px rgba(0, 0, 0, 0.3)' : 'none'
              }}
            >
              🎨 多种主题风格
            </h3>
            
            {/* 主题色彩展示 */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-4 h-4 rounded-full bg-blue-500 animate-pulse" />
              <div className="w-4 h-4 rounded-full bg-slate-700 animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 animate-pulse" style={{ animationDelay: '0.4s' }} />
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" style={{ animationDelay: '0.6s' }} />
            </div>
            
            <div className="flex items-center justify-center gap-4 mb-8">
              <Palette 
                className="w-6 h-6 animate-float" 
                style={{ 
                  color: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.8)' : theme.colors.primary 
                }} 
              />
              <span 
                className="text-lg"
                style={{ 
                  color: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.9)' : theme.colors.text,
                  textShadow: theme.mode === 'glass' ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none'
                }}
              >
                支持浅色、深色、玻璃、紫色等多种主题
              </span>
            </div>

            {/* 进入应用按钮和提示 */}
            {onEnterApp && (
              <div className="max-w-md mx-auto">
                <button
                  onClick={onEnterApp}
                  disabled={isInTransition}
                  className={`enter-app-button w-full p-4 rounded-xl font-medium transition-all duration-300 hover:scale-105 ${theme.effects.blur} mb-4 ${
                    isInTransition ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  style={{
                    background: theme.mode === 'glass'
                      ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))'
                      : `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent})`,
                    color: 'white',
                    border: theme.mode === 'glass' 
                      ? '1px solid rgba(255, 255, 255, 0.3)' 
                      : 'none',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                    boxShadow: theme.mode === 'glass'
                      ? '0 8px 32px rgba(255, 255, 255, 0.1)'
                      : '0 8px 32px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  {isTransitioningToApp
                    ? '🌟 正在进入日记世界...'
                    : hasPasswordProtection
                      ? '🔐 进入密码验证'
                      : '🚀 进入我的日记世界'
                  }
                </button>
                
                {/* 简化的提示 */}
                <div className="text-center">
                  <p
                    className="text-sm"
                    style={{
                      color: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.7)' : theme.colors.textSecondary,
                      textShadow: theme.mode === 'glass' ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none'
                    }}
                  >
                    {isTransitioningToApp
                      ? '正在进入日记世界...'
                      : `点击按钮${hasPasswordProtection ? '进入密码验证' : '进入应用'}`
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* 页脚 */}
        <footer className="pb-0 pt-4 border-t"
          style={{
            borderTopColor: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.2)' : theme.colors.border
          }}
        >
          <div className="max-w-4xl mx-auto px-4">
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-4 mb-3`}>
              {/* 关于 */}
              <div className="text-center">
                <h4 
                  className="font-semibold mb-3"
                  style={{ 
                    color: theme.mode === 'glass' ? 'white' : theme.colors.text,
                    textShadow: theme.mode === 'glass' ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none'
                  }}
                >
                  📖 关于日记本
                </h4>
                <p 
                  className="text-sm leading-relaxed"
                  style={{ 
                    color: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.7)' : theme.colors.textSecondary,
                    textShadow: theme.mode === 'glass' ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none'
                  }}
                >
                  一个简洁优雅的个人日记应用，帮助您记录生活中的每一个美好瞬间
                </p>
              </div>

              {/* 特性 */}
              <div className="text-center">
                <h4 
                  className="font-semibold mb-3"
                  style={{ 
                    color: theme.mode === 'glass' ? 'white' : theme.colors.text,
                    textShadow: theme.mode === 'glass' ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none'
                  }}
                >
                  🌟 核心特性
                </h4>
                <ul 
                  className="text-sm space-y-1"
                  style={{ 
                    color: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.7)' : theme.colors.textSecondary,
                    textShadow: theme.mode === 'glass' ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none'
                  }}
                >
                  <li>• 支持Markdown格式</li>
                  <li>• 多媒体内容支持</li>
                  <li>• 智能搜索功能</li>
                  <li>• 多主题切换</li>
                </ul>
              </div>

              {/* 技术 */}
              <div className="text-center">
                <h4 
                  className="font-semibold mb-3"
                  style={{ 
                    color: theme.mode === 'glass' ? 'white' : theme.colors.text,
                    textShadow: theme.mode === 'glass' ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none'
                  }}
                >
                  ⚡ 技术栈
                </h4>
                <p 
                  className="text-sm"
                  style={{ 
                    color: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.7)' : theme.colors.textSecondary,
                    textShadow: theme.mode === 'glass' ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none'
                  }}
                >
                  React + TypeScript + Tailwind CSS
                </p>
              </div>
            </div>

            {/* 版权信息 */}
            <div className="text-center pt-3 border-t"
              style={{
                borderTopColor: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.1)' : theme.colors.border
              }}
            >
              <p 
                className="text-sm"
                style={{ 
                  color: theme.mode === 'glass' ? 'rgba(255, 255, 255, 0.6)' : theme.colors.textSecondary,
                  textShadow: theme.mode === 'glass' ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none'
                }}
              >
                © 2025 我的日记本 - 记录生活，珍藏回忆 ✨
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
