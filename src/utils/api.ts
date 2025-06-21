import { DiaryEntry, ApiResponse } from '../types';

const API_BASE = '/api';

export class DiaryAPI {
  static async getAllEntries(): Promise<DiaryEntry[]> {
    const response = await fetch(`${API_BASE}/entries`);
    const result: ApiResponse<DiaryEntry[]> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || '获取日记失败');
    }
    
    return result.data || [];
  }

  static async getEntry(id: number): Promise<DiaryEntry> {
    const response = await fetch(`${API_BASE}/entries/${id}`);
    const result: ApiResponse<DiaryEntry> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || '获取日记失败');
    }
    
    return result.data!;
  }

  static async createEntry(entry: Omit<DiaryEntry, 'id' | 'created_at' | 'updated_at'>): Promise<DiaryEntry> {
    const response = await fetch(`${API_BASE}/entries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry),
    });
    
    const result: ApiResponse<DiaryEntry> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || '创建日记失败');
    }
    
    return result.data!;
  }

  static async updateEntry(id: number, entry: Partial<DiaryEntry>): Promise<DiaryEntry> {
    const response = await fetch(`${API_BASE}/entries/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry),
    });
    
    const result: ApiResponse<DiaryEntry> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || '更新日记失败');
    }
    
    return result.data!;
  }

  static async deleteEntry(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/entries/${id}`, {
      method: 'DELETE',
    });
    
    const result: ApiResponse = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || '删除日记失败');
    }
  }
}
