import { DiaryEntry, ApiResponse } from '../../../../src/types';

interface Env {
  DB: D1Database;
}

interface EditRequest {
  title?: string;
  content?: string;
  content_type?: string;
  mood?: string;
  weather?: string;
  tags?: string[];
  images?: string[];
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const onRequestOptions = async (): Promise<Response> => {
  return new Response(null, { headers: corsHeaders });
};

export const onRequestPost = async (context: { params: { id: string }; request: Request; env: Env }): Promise<Response> => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 11);
  
  try {
    console.log(`[${requestId}] POST /entries/${context.params.id}/edit - 开始处理`);
    
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
    let editData: EditRequest;
    try {
      editData = await context.request.json() as EditRequest;
      console.log(`[${requestId}] 编辑数据:`, Object.keys(editData));
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

    // 4. 检查日记是否存在
    const existingEntry = await context.env.DB.prepare('SELECT * FROM diary_entries WHERE id = ?').bind(id).first();
    
    if (!existingEntry) {
      console.log(`[${requestId}] 日记不存在: ID ${id}`);
      return new Response(JSON.stringify({
        success: false,
        error: '日记不存在'
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 404
      });
    }

    console.log(`[${requestId}] 找到日记: "${existingEntry.title}"`);

    // 5. 构建更新语句
    const updateFields = [];
    const updateValues = [];
    
    if (editData.title !== undefined) {
      updateFields.push('title = ?');
      updateValues.push(editData.title);
    }
    
    if (editData.content !== undefined) {
      updateFields.push('content = ?');
      updateValues.push(editData.content);
    }
    
    if (editData.content_type !== undefined) {
      updateFields.push('content_type = ?');
      updateValues.push(editData.content_type);
    }
    
    if (editData.mood !== undefined) {
      updateFields.push('mood = ?');
      updateValues.push(editData.mood);
    }
    
    if (editData.weather !== undefined) {
      updateFields.push('weather = ?');
      updateValues.push(editData.weather);
    }
    
    if (editData.tags !== undefined) {
      updateFields.push('tags = ?');
      updateValues.push(JSON.stringify(editData.tags));
    }
    
    if (editData.images !== undefined) {
      updateFields.push('images = ?');
      updateValues.push(JSON.stringify(editData.images));
    }
    
    // 总是更新 updated_at
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    
    if (updateFields.length === 1) { // 只有 updated_at
      console.log(`[${requestId}] 没有字段需要更新`);
      // 返回现有数据
      const formattedEntry: DiaryEntry = {
        id: existingEntry.id,
        title: existingEntry.title,
        content: existingEntry.content,
        content_type: existingEntry.content_type || 'markdown',
        mood: existingEntry.mood,
        weather: existingEntry.weather,
        images: JSON.parse(existingEntry.images || '[]'),
        created_at: existingEntry.created_at,
        updated_at: existingEntry.updated_at,
        tags: JSON.parse(existingEntry.tags || '[]'),
        hidden: Boolean(existingEntry.hidden)
      };
      
      return new Response(JSON.stringify({
        success: true,
        data: formattedEntry,
        message: '没有更改'
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 200
      });
    }

    // 6. 执行更新
    const sql = `UPDATE diary_entries SET ${updateFields.join(', ')} WHERE id = ?`;
    updateValues.push(id);
    
    console.log(`[${requestId}] 执行更新: ${updateFields.length - 1} 个字段`);
    
    const updateResult = await context.env.DB.prepare(sql).bind(...updateValues).run();
    
    if (!updateResult.success) {
      console.error(`[${requestId}] 数据库更新失败`);
      return new Response(JSON.stringify({
        success: false,
        error: '数据库更新失败'
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500
      });
    }

    if (updateResult.meta.changes === 0) {
      console.error(`[${requestId}] 没有记录被更新`);
      return new Response(JSON.stringify({
        success: false,
        error: '更新失败：没有记录被修改'
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500
      });
    }

    // 7. 获取更新后的数据
    const updatedEntry = await context.env.DB.prepare('SELECT * FROM diary_entries WHERE id = ?').bind(id).first();
    
    if (!updatedEntry) {
      console.error(`[${requestId}] 更新后无法获取数据`);
      return new Response(JSON.stringify({
        success: false,
        error: '更新后无法获取数据'
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500
      });
    }

    // 8. 格式化返回数据
    const formattedEntry: DiaryEntry = {
      id: updatedEntry.id,
      title: updatedEntry.title,
      content: updatedEntry.content,
      content_type: updatedEntry.content_type || 'markdown',
      mood: updatedEntry.mood,
      weather: updatedEntry.weather,
      images: JSON.parse(updatedEntry.images || '[]'),
      created_at: updatedEntry.created_at,
      updated_at: updatedEntry.updated_at,
      tags: JSON.parse(updatedEntry.tags || '[]'),
      hidden: Boolean(updatedEntry.hidden)
    };

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] 编辑成功，耗时: ${duration}ms`);

    return new Response(JSON.stringify({
      success: true,
      data: formattedEntry,
      message: '日记编辑成功'
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 200
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] 编辑失败，耗时: ${duration}ms`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: error?.constructor?.name
    });

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : '编辑日记失败'
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 500
    });
  }
};
