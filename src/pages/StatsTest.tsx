import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { DiaryStats } from '../types';
import { StatsDisplay } from '../components/StatsDisplay';

export function StatsTest() {
  const [stats, setStats] = useState<DiaryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [useApiKey, setUseApiKey] = useState<boolean>(false);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = useApiKey && apiKey
        ? await apiService.getStatsWithKey(apiKey)
        : await apiService.getStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取统计信息失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '暂无';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>日记统计 API 测试</h1>
      
      {/* API密钥测试区域 */}
      <div style={{
        backgroundColor: '#f8fafc',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3>API密钥测试</h3>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={useApiKey}
              onChange={(e) => setUseApiKey(e.target.checked)}
            />
            使用API密钥
          </label>
        </div>
        {useApiKey && (
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="输入API密钥"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px'
              }}
            />
          </div>
        )}
      </div>

      <button
        onClick={loadStats}
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {loading ? '加载中...' : '刷新统计'}
      </button>

      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#fee2e2', 
          color: '#dc2626', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          错误: {error}
        </div>
      )}

      {stats && (
        <div>
          <h2>统计信息</h2>
          <div style={{ 
            backgroundColor: '#f8fafc', 
            padding: '20px', 
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <div style={{ marginBottom: '10px' }}>
              <strong>连续日记天数:</strong> {stats.consecutive_days} 天
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>总记录天数:</strong> {stats.total_days_with_entries} 天
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>日记总数:</strong> {stats.total_entries} 篇
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>最近日记时间:</strong> {formatDate(stats.latest_entry_date)}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>第一篇日记时间:</strong> {formatDate(stats.first_entry_date)}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>当前连续开始时间:</strong> {formatDate(stats.current_streak_start)}
            </div>
          </div>

          <h2>API 响应 (JSON)</h2>
          <pre style={{ 
            backgroundColor: '#1f2937', 
            color: '#f9fafb', 
            padding: '15px', 
            borderRadius: '5px',
            overflow: 'auto',
            fontSize: '14px'
          }}>
            {JSON.stringify(stats, null, 2)}
          </pre>

          <h2>组件展示</h2>
          <StatsDisplay />
        </div>
      )}

      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
        <h3>API 使用说明</h3>
        <p><strong>接口地址:</strong> <code>/api/stats</code></p>
        <p><strong>请求方法:</strong> GET</p>
        <p><strong>返回格式:</strong> JSON</p>
        
        <h4>返回字段说明:</h4>
        <ul>
          <li><code>consecutive_days</code>: 连续日记多少天</li>
          <li><code>total_days_with_entries</code>: 一共日记多少天</li>
          <li><code>total_entries</code>: 多少篇日记</li>
          <li><code>latest_entry_date</code>: 最近日记什么时间</li>
          <li><code>first_entry_date</code>: 第一篇日记时间</li>
          <li><code>current_streak_start</code>: 当前连续记录开始时间</li>
        </ul>

        <h4>示例请求:</h4>
        <pre style={{ 
          backgroundColor: '#1f2937', 
          color: '#f9fafb', 
          padding: '10px', 
          borderRadius: '5px',
          fontSize: '12px'
        }}>
{`fetch('/api/stats')
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('统计信息:', data.data);
    }
  });`}
        </pre>
      </div>
    </div>
  );
}
