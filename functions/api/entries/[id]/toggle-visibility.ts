import { DiaryEntry, ApiResponse } from '../../../../src/types';

interface Env {
  DB: D1Database;
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

export const onRequestPost = async (context: { params: { id: string }; env: Env }): Promise<Response> => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 11);
  
  try {
    console.log(`[${requestId}] POST /entries/${context.params.id}/toggle-visibility - 开始处理`);
    
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

    // 2. 检查数据库连接
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

    // 3. 获取当前日记
    const currentEntry = await context.env.DB.prepare('SELECT id, title, hidden FROM diary_entries WHERE id = ?').bind(id).first();
    
    if (!currentEntry) {
      console.log(`[${requestId}] 日记不存在: ID ${id}`);
      return new Response(JSON.stringify({
        success: false,
        error: '日记不存在'
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 404
      });
    }

    const currentHidden = Boolean(currentEntry.hidden);
    const newHidden = !currentHidden;
    
    console.log(`[${requestId}] 切换隐藏状态: ${currentHidden} -> ${newHidden}`);

    // 4. 更新隐藏状态
    const updateResult = await context.env.DB.prepare(
      'UPDATE diary_entries SET hidden = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(newHidden ? 1 : 0, id).run();

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

    // 5. 获取更新后的完整数据
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

    // 6. 格式化返回数据
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
    console.log(`[${requestId}] 隐藏状态切换成功，耗时: ${duration}ms`);

    return new Response(JSON.stringify({
      success: true,
      data: formattedEntry,
      message: `日记已${newHidden ? '隐藏' : '显示'}`
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 200
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] 隐藏状态切换失败，耗时: ${duration}ms`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: error?.constructor?.name
    });

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : '切换隐藏状态失败'
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      status: 500
    });
  }
};
