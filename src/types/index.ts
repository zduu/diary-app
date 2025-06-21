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

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type MoodType = 'happy' | 'sad' | 'neutral' | 'excited' | 'anxious' | 'peaceful' | 'calm' | 'angry' | 'grateful' | 'loved';
export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'unknown';
