// Types
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Database class
class DiaryDatabase {
  constructor(private db: D1Database) {}

  async getAllSettings(): Promise<Record<string, string>> {
    const { results } = await this.db.prepare(
      'SELECT setting_key, setting_value FROM app_settings'
    ).all();

    const settings: Record<string, string> = {};
    for (const row of results) {
      settings[row.setting_key] = row.setting_value;
    }
    return settings;
  }
}

interface Env {
  DB: D1Database;
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
    const settings = await db.getAllSettings();
    
    const response: ApiResponse = { success: true, data: settings };
    
    return new Response(JSON.stringify(response), {
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Get settings error:', error);
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
