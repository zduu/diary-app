// 日记统计API接口

interface DiaryEntry {
  id?: number;
  title: string;
  content: string;
  content_type?: 'markdown' | 'plain';
  mood?: string;
  weather?: string;
  images?: string[];
  location?: any;
  created_at?: string;
  updated_at?: string;
  tags?: string[];
  hidden?: boolean;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface DiaryStats {
  consecutive_days: number;        // 连续日记多少天
  total_days_with_entries: number; // 一共日记多少天
  total_entries: number;          // 多少篇日记
  latest_entry_date: string | null; // 最近日记时间
  first_entry_date: string | null;  // 第一篇日记时间
  current_streak_start: string | null; // 当前连续记录开始时间
}

interface Env {
  DB: D1Database;
  STATS_API_KEY?: string; // 统计API访问密钥
}

// 计算连续日记天数
function calculateConsecutiveDays(entries: DiaryEntry[]): { consecutive_days: number, current_streak_start: string | null } {
  if (entries.length === 0) {
    return { consecutive_days: 0, current_streak_start: null };
  }

  // 按日期排序（最新的在前）
  const sortedEntries = entries.sort((a, b) => 
    new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
  );

  // 获取每天的日期（去重）
  const uniqueDates = Array.from(new Set(
    sortedEntries.map(entry => {
      const date = new Date(entry.created_at || '');
      return date.toISOString().split('T')[0]; // YYYY-MM-DD格式
    })
  )).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (uniqueDates.length === 0) {
    return { consecutive_days: 0, current_streak_start: null };
  }

  let consecutiveDays = 1;
  let currentStreakStart = uniqueDates[0];
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // 检查最新日记是否是今天或昨天
  const latestDate = uniqueDates[0];
  if (latestDate !== todayStr && latestDate !== yesterdayStr) {
    // 如果最新日记不是今天或昨天，连续天数为0
    return { consecutive_days: 0, current_streak_start: null };
  }

  // 从最新日期开始，检查连续性
  for (let i = 1; i < uniqueDates.length; i++) {
    const currentDate = new Date(uniqueDates[i - 1]);
    const nextDate = new Date(uniqueDates[i]);
    const diffTime = currentDate.getTime() - nextDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      consecutiveDays++;
      currentStreakStart = uniqueDates[i];
    } else {
      break;
    }
  }

  return { consecutive_days: consecutiveDays, current_streak_start: currentStreakStart };
}

// 计算总共有日记的天数
function calculateTotalDaysWithEntries(entries: DiaryEntry[]): number {
  const uniqueDates = new Set(
    entries.map(entry => {
      const date = new Date(entry.created_at || '');
      return date.toISOString().split('T')[0]; // YYYY-MM-DD格式
    })
  );
  return uniqueDates.size;
}

// 验证API密钥
function validateApiKey(request: Request, env: Env): boolean {
  // 如果没有设置API密钥，则允许访问（向后兼容）
  if (!env.STATS_API_KEY) {
    return true;
  }

  // 检查 Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return token === env.STATS_API_KEY;
  }

  // 检查 X-API-Key header
  const apiKeyHeader = request.headers.get('X-API-Key');
  if (apiKeyHeader) {
    return apiKeyHeader === env.STATS_API_KEY;
  }

  // 检查查询参数
  const url = new URL(request.url);
  const apiKeyParam = url.searchParams.get('api_key');
  if (apiKeyParam) {
    return apiKeyParam === env.STATS_API_KEY;
  }

  return false;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { DB } = context.env;

    // 验证API密钥
    if (!validateApiKey(context.request, context.env)) {
      const response: ApiResponse = {
        success: false,
        error: '访问被拒绝',
        message: '无效的API密钥'
      };

      return new Response(JSON.stringify(response), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // 获取所有日记（包括隐藏的）
    const result = await DB.prepare(`
      SELECT id, title, content, content_type, mood, weather, images, location, 
             created_at, updated_at, tags, hidden
      FROM diary_entries 
      ORDER BY created_at DESC
    `).all();

    const entries: DiaryEntry[] = result.results.map((row: any) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      content_type: row.content_type || 'markdown',
      mood: row.mood,
      weather: row.weather,
      images: row.images ? JSON.parse(row.images) : [],
      location: row.location ? JSON.parse(row.location) : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      tags: row.tags ? JSON.parse(row.tags) : [],
      hidden: Boolean(row.hidden)
    }));

    // 计算统计信息
    const { consecutive_days, current_streak_start } = calculateConsecutiveDays(entries);
    const total_days_with_entries = calculateTotalDaysWithEntries(entries);
    const total_entries = entries.length;
    
    // 获取最新和最早的日记时间
    const latest_entry_date = entries.length > 0 ? entries[0].created_at || null : null;
    const first_entry_date = entries.length > 0 ? entries[entries.length - 1].created_at || null : null;

    const stats: DiaryStats = {
      consecutive_days,
      total_days_with_entries,
      total_entries,
      latest_entry_date,
      first_entry_date,
      current_streak_start
    };

    const response: ApiResponse<DiaryStats> = {
      success: true,
      data: stats
    };

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('获取日记统计失败:', error);
    
    const response: ApiResponse = {
      success: false,
      error: '获取日记统计失败',
      message: error instanceof Error ? error.message : '未知错误'
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};

// 处理OPTIONS请求（CORS预检）
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    },
  });
};
