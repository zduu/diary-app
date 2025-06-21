import { ApiResponse } from '../../../src/types';

interface Env {
  DB: D1Database;
}

class DiaryDatabase {
  constructor(private db: D1Database) {}

  async getSetting(key: string): Promise<string | null> {
    const result = await this.db.prepare(
      'SELECT setting_value FROM app_settings WHERE setting_key = ?'
    ).bind(key).first();

    return result ? result.setting_value : null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    // 使用 UPSERT 语法 (INSERT OR REPLACE)
    await this.db.prepare(`
      INSERT OR REPLACE INTO app_settings (setting_key, setting_value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `).bind(key, value).run();
  }

  async deleteSetting(key: string): Promise<void> {
    await this.db.prepare(
      'DELETE FROM app_settings WHERE setting_key = ?'
    ).bind(key).run();
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

export const onRequestGet = async (context: { params: { key: string }; env: Env }): Promise<Response> => {
  try {
    const { key } = context.params;
    
    if (!key) {
      const response: ApiResponse = { 
        success: false, 
        error: '缺少设置键名' 
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
    const value = await db.getSetting(key);
    
    if (value === null) {
      const response: ApiResponse = { 
        success: false, 
        error: '设置不存在' 
      };
      return new Response(JSON.stringify(response), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        status: 404
      });
    }
    
    const response: ApiResponse = { 
      success: true, 
      data: { [key]: value } 
    };
    
    return new Response(JSON.stringify(response), {
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Get setting error:', error);
    const response: ApiResponse = { 
      success: false, 
      error: '获取设置失败' 
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

export const onRequestPut = async (context: { params: { key: string }; request: Request; env: Env }): Promise<Response> => {
  try {
    const { key } = context.params;
    
    if (!key) {
      const response: ApiResponse = { 
        success: false, 
        error: '缺少设置键名' 
      };
      return new Response(JSON.stringify(response), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        status: 400
      });
    }

    const body = await context.request.json() as { value: string };
    
    if (typeof body.value !== 'string') {
      const response: ApiResponse = { 
        success: false, 
        error: '设置值必须是字符串' 
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
    await db.setSetting(key, body.value);
    
    const response: ApiResponse = { 
      success: true, 
      message: '设置更新成功' 
    };
    
    return new Response(JSON.stringify(response), {
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Update setting error:', error);
    const response: ApiResponse = { 
      success: false, 
      error: error instanceof Error ? error.message : '更新设置失败' 
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

export const onRequestDelete = async (context: { params: { key: string }; env: Env }): Promise<Response> => {
  try {
    const { key } = context.params;
    
    if (!key) {
      const response: ApiResponse = { 
        success: false, 
        error: '缺少设置键名' 
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
    await db.deleteSetting(key);
    
    const response: ApiResponse = { 
      success: true, 
      message: '设置删除成功' 
    };
    
    return new Response(JSON.stringify(response), {
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Delete setting error:', error);
    const response: ApiResponse = { 
      success: false, 
      error: error instanceof Error ? error.message : '删除设置失败' 
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
