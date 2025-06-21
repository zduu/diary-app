import { DiaryDatabase } from './database';
import { Env, ApiResponse, DiaryEntry } from './types';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight requests
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const db = new DiaryDatabase(env.DB);

    try {
      // API routes
      if (path.startsWith('/api/')) {
        let response: ApiResponse;

        if (path === '/api/entries' && method === 'GET') {
          // Get all entries
          const entries = await db.getAllEntries();
          response = { success: true, data: entries };
        } 
        else if (path === '/api/entries' && method === 'POST') {
          // Create new entry
          const body = await request.json() as DiaryEntry;
          const entry = await db.createEntry(body);
          response = { success: true, data: entry, message: '日记创建成功' };
        }
        else if (path.match(/^\/api\/entries\/\d+$/) && method === 'GET') {
          // Get single entry
          const id = parseInt(path.split('/').pop()!);
          const entry = await db.getEntry(id);
          if (entry) {
            response = { success: true, data: entry };
          } else {
            response = { success: false, error: '日记不存在' };
          }
        }
        else if (path.match(/^\/api\/entries\/\d+$/) && method === 'PUT') {
          // Update entry
          const id = parseInt(path.split('/').pop()!);
          const body = await request.json() as Partial<DiaryEntry>;
          const entry = await db.updateEntry(id, body);
          if (entry) {
            response = { success: true, data: entry, message: '日记更新成功' };
          } else {
            response = { success: false, error: '日记不存在' };
          }
        }
        else if (path.match(/^\/api\/entries\/\d+$/) && method === 'DELETE') {
          // Delete entry
          const id = parseInt(path.split('/').pop()!);
          const deleted = await db.deleteEntry(id);
          if (deleted) {
            response = { success: true, message: '日记删除成功' };
          } else {
            response = { success: false, error: '日记不存在' };
          }
        }
        else if (path === '/api/entries/batch' && method === 'POST') {
          // Batch import entries
          const body = await request.json() as { entries: DiaryEntry[] };
          const result = await db.batchImportEntries(body.entries);
          response = { success: true, data: result, message: `成功导入 ${result.length} 条日记` };
        }
        else if (path === '/api/entries/batch' && method === 'PUT') {
          // Batch update entries (for admin panel)
          const body = await request.json() as { entries: DiaryEntry[] };
          const result = await db.batchUpdateEntries(body.entries);
          response = { success: true, data: result, message: `成功更新 ${result.length} 条日记` };
        }
        else if (path === '/api/settings' && method === 'GET') {
          // Get all settings
          const settings = await db.getAllSettings();
          response = { success: true, data: settings };
        }
        else if (path.match(/^\/api\/settings\/[^\/]+$/) && method === 'GET') {
          // Get single setting
          const key = path.split('/').pop()!;
          const value = await db.getSetting(key);
          if (value !== null) {
            response = { success: true, data: { [key]: value } };
          } else {
            response = { success: false, error: '设置不存在' };
          }
        }
        else if (path.match(/^\/api\/settings\/[^\/]+$/) && method === 'PUT') {
          // Update setting
          const key = path.split('/').pop()!;
          const body = await request.json() as { value: string };
          await db.setSetting(key, body.value);
          response = { success: true, message: '设置更新成功' };
        }
        else {
          response = { success: false, error: '接口不存在' };
        }

        return new Response(JSON.stringify(response), {
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          status: response.success ? 200 : 404
        });
      }

      // Default response
      return new Response('Diary App API', { 
        headers: corsHeaders 
      });

    } catch (error) {
      console.error('API Error:', error);
      const response: ApiResponse = { 
        success: false, 
        error: '服务器内部错误' 
      };
      
      return new Response(JSON.stringify(response), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        status: 500
      });
    }
  },
};
