import { DiaryEntry, ApiResponse } from '../../../src/types';

interface Env {
  DB: D1Database;
}

class DiaryDatabase {
  constructor(private db: D1Database) {}

  async getEntry(id: number): Promise<DiaryEntry | null> {
    const result = await this.db.prepare(
      'SELECT * FROM diary_entries WHERE id = ?'
    ).bind(id).first();

    if (!result) {
      return null;
    }

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

    // 验证删除是否成功 - 添加重试机制来处理D1一致性问题
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      // 等待一小段时间让数据库同步
      await new Promise(resolve => setTimeout(resolve, 100 * (retryCount + 1)));
      
      const checkResult = await this.db.prepare('SELECT id FROM diary_entries WHERE id = ?').bind(id).first();
      
      if (!checkResult) {
        // 删除成功
        return;
      }
      
      retryCount++;
      
      if (retryCount < maxRetries) {
        // 重试删除
        await this.db.prepare('DELETE FROM diary_entries WHERE id = ?').bind(id).run();
      }
    }
    
    // 如果重试后仍然存在，抛出错误
    throw new Error('删除操作未能完全同步，请稍后重试');
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

export const onRequestGet = async (context: { params: { id: string }; env: Env }): Promise<Response> => {
  try {
    const id = parseInt(context.params.id);
    if (isNaN(id)) {
      const response: ApiResponse = { 
        success: false, 
        error: '无效的ID' 
      };
      return new Response(JSON.stringify(response), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        status: 400
      });
    }

    const db = new DiaryDatabase(context.env.DB);
    const entry = await db.getEntry(id);
    
    if (!entry) {
      const response: ApiResponse = { 
        success: false, 
        error: '日记不存在' 
      };
      return new Response(JSON.stringify(response), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        status: 404
      });
    }
    
    const response: ApiResponse = { success: true, data: entry };
    
    return new Response(JSON.stringify(response), {
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Get entry error:', error);
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

export const onRequestPut = async (context: { params: { id: string }; request: Request; env: Env }): Promise<Response> => {
  try {
    const id = parseInt(context.params.id);
    if (isNaN(id)) {
      const response: ApiResponse = { 
        success: false, 
        error: '无效的ID' 
      };
      return new Response(JSON.stringify(response), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        status: 400
      });
    }

    const body = await context.request.json() as Partial<DiaryEntry>;
    const db = new DiaryDatabase(context.env.DB);
    const entry = await db.updateEntry(id, body);
    
    const response: ApiResponse = { 
      success: true, 
      data: entry, 
      message: '日记更新成功' 
    };
    
    return new Response(JSON.stringify(response), {
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Update entry error:', error);
    const response: ApiResponse = { 
      success: false, 
      error: error instanceof Error ? error.message : '更新日记失败' 
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

export const onRequestDelete = async (context: { params: { id: string }; env: Env }): Promise<Response> => {
  try {
    const id = parseInt(context.params.id);
    if (isNaN(id)) {
      const response: ApiResponse = { 
        success: false, 
        error: '无效的ID' 
      };
      return new Response(JSON.stringify(response), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        status: 400
      });
    }

    const db = new DiaryDatabase(context.env.DB);
    await db.deleteEntry(id);
    
    const response: ApiResponse = { 
      success: true, 
      message: '日记删除成功' 
    };
    
    return new Response(JSON.stringify(response), {
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Delete entry error:', error);
    const response: ApiResponse = { 
      success: false, 
      error: error instanceof Error ? error.message : '删除日记失败' 
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
