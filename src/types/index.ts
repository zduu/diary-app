export interface POI {
  name: string;
  type: string;
  distance: number;
}

export interface LocationDetails {
  building?: string;
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface LocationInfo {
  name?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  nearbyPOIs?: POI[];
  details?: LocationDetails;
}

export interface DiaryEntry {
  id?: number;
  title: string;
  content: string;
  content_type?: 'markdown' | 'plain';
  mood?: string;
  weather?: string;
  images?: string[];
  location?: LocationInfo | null;
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
