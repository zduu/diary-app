export interface DiaryEntry {
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

export interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
