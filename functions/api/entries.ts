// Types
interface DiaryEntry {
  id?: number;
  title: string;
  content: string;
  content_type?: 'markdown' | 'plain';
  mood?: string;
  weather?: string;
  images?: string[];
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

interface Env {
  DB: D1Database;
}

// Database class
class DiaryDatabase {
  constructor(private db: D1Database) {}

  async getAllEntries(): Promise<DiaryEntry[]> {
    const { results } = await this.db.prepare(
      'SELECT * FROM diary_entries ORDER BY created_at DESC'
    ).all();
    
    return results.map(this.formatEntry);
  }

  async createEntry(entry: Omit<DiaryEntry, 'id' | 'created_at' | 'updated_at'>): Promise<DiaryEntry> {
    const tagsJson = JSON.stringify(entry.tags || []);
    const imagesJson = JSON.stringify(entry.images || []);

    const result = await this.db.prepare(`
      INSERT INTO diary_entries (title, content, content_type, mood, weather, images, tags, hidden)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      entry.title,
      entry.content,
      entry.content_type || 'markdown',
      entry.mood || 'neutral',
      entry.weather || 'unknown',
      imagesJson,
      tagsJson,
      entry.hidden ? 1 : 0
    ).first();

    return this.formatEntry(result);
  }

  async updateEntry(id: number, updates: Partial<DiaryEntry>): Promise<DiaryEntry> {
    // 首先检查条目是否存在
    const existing = await this.db.prepare('SELECT * FROM diary_entries WHERE id = ?').bind(id).first();
    if (!existing) {
      throw new Error('日记不存在');
    }

    const tagsJson = updates.tags ? JSON.stringify(updates.tags) : undefined;
    const imagesJson = updates.images ? JSON.stringify(updates.images) : undefined;

    const result = await this.db.prepare(`
      UPDATE diary_entries
      SET title = COALESCE(?, title),
          content = COALESCE(?, content),
          content_type = COALESCE(?, content_type),
          mood = COALESCE(?, mood),
          weather = COALESCE(?, weather),
          images = COALESCE(?, images),
          tags = COALESCE(?, tags),
          hidden = COALESCE(?, hidden),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `).bind(
      updates.title,
      updates.content,
      updates.content_type,
      updates.mood,
      updates.weather,
      imagesJson,
      tagsJson,
      updates.hidden !== undefined ? (updates.hidden ? 1 : 0) : undefined,
      id
    ).first();

    return this.formatEntry(result);
  }

  async deleteEntry(id: number): Promise<void> {
    // 首先检查条目是否存在
    const existing = await this.db.prepare('SELECT id FROM diary_entries WHERE id = ?').bind(id).first();
    if (!existing) {
      throw new Error('日记不存在');
    }

    // 执行删除
    const result = await this.db.prepare('DELETE FROM diary_entries WHERE id = ?').bind(id).run();

    if (result.changes === 0) {
      throw new Error('删除失败');
    }
  }

  private formatEntry(row: any): DiaryEntry {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      content_type: row.content_type || 'markdown',
      mood: row.mood,
      weather: row.weather,
      images: JSON.parse(row.images || '[]'),
      created_at: row.created_at,
      updated_at: row.updated_at,
      tags: JSON.parse(row.tags || '[]'),
      hidden: Boolean(row.hidden)
    };
  }
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const onRequestOptions = async (): Promise<Response> => {
  return new Response(null, { headers: corsHeaders });
};

export const onRequestGet = async (context: { env: Env }): Promise<Response> => {
  try {
    const db = new DiaryDatabase(context.env.DB);
    const entries = await db.getAllEntries();
    
    const response: ApiResponse = { success: true, data: entries };
    
    return new Response(JSON.stringify(response), {
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Get entries error:', error);
    const response: ApiResponse = { 
      success: false, 
      error: '获取日记失败' 
    };
    
    return new Response(JSON.stringify(response), {
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      },
      status: 500
    });
  }
};

export const onRequestPost = async (context: { request: Request; env: Env }): Promise<Response> => {
  try {
    const body = await context.request.json() as DiaryEntry;
    const db = new DiaryDatabase(context.env.DB);
    const entry = await db.createEntry(body);
    
    const response: ApiResponse = { 
      success: true, 
      data: entry, 
      message: '日记创建成功' 
    };
    
    return new Response(JSON.stringify(response), {
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Create entry error:', error);
    const response: ApiResponse = { 
      success: false, 
      error: '创建日记失败' 
    };
    
    return new Response(JSON.stringify(response), {
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      },
      status: 500
    });
  }
};
