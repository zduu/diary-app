import { DiaryEntry, ApiResponse, LocationInfo, POI, LocationDetails } from '../../../src/types';

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
    console.log(`[UPDATE] 开始更新日记 ID: ${id}, 更新字段:`, Object.keys(updates));

    try {
      // 1. 先检查日记是否存在
      const existingEntry = await this.db.prepare('SELECT * FROM diary_entries WHERE id = ?').bind(id).first();
      if (!existingEntry) {
        console.log(`[UPDATE] 日记 ID ${id} 不存在`);
        throw new Error('日记不存在');
      }

      console.log(`[UPDATE] 找到日记 ID ${id}, 标题: "${existingEntry.title}"`);

      // 2. 构建更新语句 - 只更新提供的字段
      const updateFields = [];
      const updateValues = [];

      if (updates.title !== undefined) {
        updateFields.push('title = ?');
        updateValues.push(updates.title);
      }

      if (updates.content !== undefined) {
        updateFields.push('content = ?');
        updateValues.push(updates.content);
      }

      if (updates.content_type !== undefined) {
        updateFields.push('content_type = ?');
        updateValues.push(updates.content_type);
      }

      if (updates.mood !== undefined) {
        updateFields.push('mood = ?');
        updateValues.push(updates.mood);
      }

      if (updates.weather !== undefined) {
        updateFields.push('weather = ?');
        updateValues.push(updates.weather);
      }

      if (updates.tags !== undefined) {
        updateFields.push('tags = ?');
        updateValues.push(JSON.stringify(updates.tags));
      }

      if (updates.images !== undefined) {
        updateFields.push('images = ?');
        updateValues.push(JSON.stringify(updates.images));
      }

      if (updates.hidden !== undefined) {
        updateFields.push('hidden = ?');
        updateValues.push(updates.hidden ? 1 : 0);
      }

      // 总是更新 updated_at
      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      if (updateFields.length === 1) { // 只有 updated_at
        console.log(`[UPDATE] 没有字段需要更新`);
        return this.formatEntry(existingEntry);
      }

      // 3. 执行更新
      const sql = `UPDATE diary_entries SET ${updateFields.join(', ')} WHERE id = ?`;
      updateValues.push(id);

      console.log(`[UPDATE] 执行SQL: ${sql}`);
      console.log(`[UPDATE] 参数:`, updateValues);

      const updateResult = await this.db.prepare(sql).bind(...updateValues).run();

      console.log(`[UPDATE] 更新结果:`, {
        success: updateResult.success,
        changes: updateResult.meta?.changes,
        lastRowId: updateResult.meta?.last_row_id
      });

      if (!updateResult.success) {
        throw new Error('数据库更新操作失败');
      }

      if (updateResult.meta.changes === 0) {
        throw new Error('没有记录被更新');
      }

      // 4. 获取更新后的数据
      const updatedEntry = await this.db.prepare('SELECT * FROM diary_entries WHERE id = ?').bind(id).first();

      if (!updatedEntry) {
        throw new Error('更新后无法获取数据');
      }

      console.log(`[UPDATE] 更新成功: 日记 ID ${id}`);
      return this.formatEntry(updatedEntry);

    } catch (error) {
      console.error(`[UPDATE] 更新失败: 日记 ID ${id}`, error);
      throw error;
    }
  }

  async deleteEntry(id: number): Promise<void> {
    // 首先检查条目是否存在
    const existing = await this.db.prepare('SELECT id FROM diary_entries WHERE id = ?').bind(id).first();
    if (!existing) {
      throw new Error('日记不存在');
    }

    // 执行删除
    const result = await this.db.prepare('DELETE FROM diary_entries WHERE id = ?').bind(id).run();

    if (result.meta.changes === 0) {
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
      location: row.location ? JSON.parse(row.location) : null,
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
  const startTime = Date.now();
  let requestId = Math.random().toString(36).substring(2, 11);

  try {
    console.log(`[${requestId}] PUT /entries/${context.params.id} - 开始处理`);

    // 1. 验证ID
    const id = parseInt(context.params.id);
    if (isNaN(id) || id <= 0) {
      console.log(`[${requestId}] 无效的ID: ${context.params.id}`);
      return new Response(JSON.stringify({
        success: false,
        error: '无效的日记ID'
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 400
      });
    }

    // 2. 解析请求体
    let body;
    try {
      body = await context.request.json() as Partial<DiaryEntry>;
      console.log(`[${requestId}] 请求体解析成功:`, Object.keys(body));
    } catch (parseError) {
      console.error(`[${requestId}] 请求体解析失败:`, parseError);
      return new Response(JSON.stringify({
        success: false,
        error: '请求数据格式错误'
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 400
      });
    }

    // 3. 检查数据库连接
    if (!context.env?.DB) {
      console.error(`[${requestId}] 数据库连接不可用`);
      return new Response(JSON.stringify({
        success: false,
        error: '数据库服务不可用'
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 503
      });
    }

    // 4. 执行更新
    const db = new DiaryDatabase(context.env.DB);
    const updatedEntry = await db.updateEntry(id, body);

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] 更新成功，耗时: ${duration}ms`);

    return new Response(JSON.stringify({
      success: true,
      data: updatedEntry,
      message: '日记更新成功'
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 200
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] 更新失败，耗时: ${duration}ms`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: error?.constructor?.name
    });

    // 根据错误类型返回不同的状态码
    let statusCode = 500;
    let errorMessage = '服务器内部错误';

    if (error instanceof Error) {
      if (error.message.includes('不存在')) {
        statusCode = 404;
        errorMessage = error.message;
      } else if (error.message.includes('无效') || error.message.includes('格式')) {
        statusCode = 400;
        errorMessage = error.message;
      } else {
        errorMessage = error.message;
      }
    }

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: statusCode
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
