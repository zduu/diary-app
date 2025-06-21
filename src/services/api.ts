import { DiaryEntry, ApiResponse } from '../types';

const API_BASE_URL = '/api';

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // 获取所有日记
  async getAllEntries(): Promise<DiaryEntry[]> {
    const response = await this.request<DiaryEntry[]>('/entries');
    return response.data || [];
  }

  // 获取单个日记
  async getEntry(id: number): Promise<DiaryEntry | null> {
    const response = await this.request<DiaryEntry>(`/entries/${id}`);
    return response.data || null;
  }

  // 创建日记
  async createEntry(entry: Omit<DiaryEntry, 'id' | 'created_at' | 'updated_at'>): Promise<DiaryEntry> {
    const response = await this.request<DiaryEntry>('/entries', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
    
    if (!response.success || !response.data) {
      throw new Error(response.error || '创建失败');
    }
    
    return response.data;
  }

  // 更新日记
  async updateEntry(id: number, entry: Partial<DiaryEntry>): Promise<DiaryEntry> {
    const response = await this.request<DiaryEntry>(`/entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(entry),
    });
    
    if (!response.success || !response.data) {
      throw new Error(response.error || '更新失败');
    }
    
    return response.data;
  }

  // 删除日记
  async deleteEntry(id: number): Promise<void> {
    const response = await this.request(`/entries/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.success) {
      throw new Error(response.error || '删除失败');
    }
  }

  // 批量导入日记
  async batchImportEntries(entries: DiaryEntry[]): Promise<DiaryEntry[]> {
    const response = await this.request<DiaryEntry[]>('/entries/batch', {
      method: 'POST',
      body: JSON.stringify({ entries }),
    });
    
    if (!response.success || !response.data) {
      throw new Error(response.error || '导入失败');
    }
    
    return response.data;
  }

  // 批量更新日记
  async batchUpdateEntries(entries: DiaryEntry[]): Promise<DiaryEntry[]> {
    const response = await this.request<DiaryEntry[]>('/entries/batch', {
      method: 'PUT',
      body: JSON.stringify({ entries }),
    });

    if (!response.success || !response.data) {
      throw new Error(response.error || '批量更新失败');
    }

    return response.data;
  }

  // 获取所有设置
  async getAllSettings(): Promise<Record<string, string>> {
    const response = await this.request<Record<string, string>>('/settings');
    return response.data || {};
  }

  // 获取单个设置
  async getSetting(key: string): Promise<string | null> {
    try {
      const response = await this.request<Record<string, string>>(`/settings/${key}`);
      return response.data?.[key] || null;
    } catch (error) {
      return null;
    }
  }

  // 更新设置
  async setSetting(key: string, value: string): Promise<void> {
    const response = await this.request(`/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });

    if (!response.success) {
      throw new Error(response.error || '设置更新失败');
    }
  }
}

export const apiService = new ApiService();
