import { DiaryEntry, ApiResponse } from '../types';

const API_BASE_URL = '/api';

// Mock数据服务，用于本地开发
class MockApiService {
  private readonly STORAGE_KEY = 'diary_app_data';
  private readonly SETTINGS_KEY = 'diary_app_settings';

  private getStoredEntries(): DiaryEntry[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : this.getDefaultEntries();
    } catch {
      return this.getDefaultEntries();
    }
  }

  private saveEntries(entries: DiaryEntry[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries));
  }

  private getStoredSettings(): Record<string, string> {
    try {
      const data = localStorage.getItem(this.SETTINGS_KEY);
      return data ? JSON.parse(data) : this.getDefaultSettings();
    } catch {
      return this.getDefaultSettings();
    }
  }

  private saveSettings(settings: Record<string, string>): void {
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
  }

  private getDefaultEntries(): DiaryEntry[] {
    return [
      {
        id: 1,
        title: '公园散步的美好时光',
        content: '今天天气很好，和朋友一起去**公园散步**，心情特别愉快。\n\n看到了很多美丽的花朵 🌸，还遇到了可爱的小狗 🐕。和朋友聊了很多有趣的话题。\n\n> 生活中的小美好总是让人感到幸福',
        content_type: 'markdown',
        mood: 'happy',
        weather: 'sunny',
        tags: ['散步', '朋友', '公园'],
        images: [],
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString(),
        hidden: false
      },
      {
        id: 2,
        title: '工作中的成长与收获',
        content: '今天在工作中遇到了一些挑战，但通过**团队合作**成功解决了问题。\n\n学到了很多新的技术知识：\n- React Hook 的高级用法\n- TypeScript 类型推导\n- 团队协作的重要性\n\n感觉自己又成长了一些 💪',
        content_type: 'markdown',
        mood: 'neutral',
        weather: 'cloudy',
        tags: ['工作', '学习', '团队'],
        images: [],
        created_at: new Date(Date.now() - 172800000).toISOString(),
        updated_at: new Date(Date.now() - 172800000).toISOString(),
        hidden: false
      },
      {
        id: 3,
        title: '雨天的宁静思考',
        content: '下雨天总是让人感到宁静，坐在窗边听雨声，思考人生的意义。\n\n今天读了《人生的智慧》，收获颇丰。\n\n*雨声滴答，思绪万千...*\n\n有时候慢下来，静静地感受生活，也是一种幸福。',
        content_type: 'markdown',
        mood: 'peaceful',
        weather: 'rainy',
        tags: ['读书', '思考', '雨天'],
        images: [],
        created_at: new Date(Date.now() - 259200000).toISOString(),
        updated_at: new Date(Date.now() - 259200000).toISOString(),
        hidden: false
      }
    ];
  }

  private getDefaultSettings(): Record<string, string> {
    return {
      admin_password: 'admin123',
      app_password_enabled: 'false',
      app_password: 'diary123'
    };
  }

  private generateId(): number {
    const entries = this.getStoredEntries();
    return Math.max(0, ...entries.map(e => e.id || 0)) + 1;
  }

  async getAllEntries(): Promise<DiaryEntry[]> {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.getStoredEntries();
  }

  async getEntry(id: number): Promise<DiaryEntry | null> {
    await new Promise(resolve => setTimeout(resolve, 50));
    const entries = this.getStoredEntries();
    return entries.find(entry => entry.id === id) || null;
  }

  async createEntry(entry: Omit<DiaryEntry, 'id' | 'created_at' | 'updated_at'>): Promise<DiaryEntry> {
    await new Promise(resolve => setTimeout(resolve, 100));

    const entries = this.getStoredEntries();
    const now = new Date().toISOString();
    const newEntry: DiaryEntry = {
      ...entry,
      id: this.generateId(),
      created_at: now,
      updated_at: now,
      content_type: entry.content_type || 'markdown',
      mood: entry.mood || 'neutral',
      weather: entry.weather || 'unknown',
      tags: entry.tags || [],
      images: entry.images || [],
      hidden: entry.hidden || false
    };

    entries.unshift(newEntry);
    this.saveEntries(entries);
    return newEntry;
  }

  async updateEntry(id: number, updates: Partial<DiaryEntry>): Promise<DiaryEntry> {
    await new Promise(resolve => setTimeout(resolve, 100));

    const entries = this.getStoredEntries();
    const index = entries.findIndex(entry => entry.id === id);

    if (index === -1) {
      throw new Error('日记不存在');
    }

    const updatedEntry = {
      ...entries[index],
      ...updates,
      id,
      updated_at: new Date().toISOString()
    };

    entries[index] = updatedEntry;
    this.saveEntries(entries);
    return updatedEntry;
  }

  async deleteEntry(id: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));

    const entries = this.getStoredEntries();
    const filteredEntries = entries.filter(entry => entry.id !== id);

    if (filteredEntries.length === entries.length) {
      throw new Error('日记不存在');
    }

    this.saveEntries(filteredEntries);
  }

  async batchImportEntries(newEntries: DiaryEntry[]): Promise<DiaryEntry[]> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const entries = this.getStoredEntries();
    const importedEntries: DiaryEntry[] = [];

    for (const entry of newEntries) {
      const newEntry: DiaryEntry = {
        ...entry,
        id: this.generateId(),
        created_at: entry.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      entries.unshift(newEntry);
      importedEntries.push(newEntry);
    }

    this.saveEntries(entries);
    return importedEntries;
  }

  async batchUpdateEntries(updatedEntries: DiaryEntry[]): Promise<DiaryEntry[]> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const entries = this.getStoredEntries();
    const results: DiaryEntry[] = [];

    for (const updatedEntry of updatedEntries) {
      const index = entries.findIndex(entry => entry.id === updatedEntry.id);
      if (index !== -1) {
        const updated = {
          ...updatedEntry,
          updated_at: new Date().toISOString()
        };
        entries[index] = updated;
        results.push(updated);
      }
    }

    this.saveEntries(entries);
    return results;
  }

  async getAllSettings(): Promise<Record<string, string>> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return this.getStoredSettings();
  }

  async getSetting(key: string): Promise<string | null> {
    await new Promise(resolve => setTimeout(resolve, 50));
    const settings = this.getStoredSettings();
    return settings[key] || null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 50));
    const settings = this.getStoredSettings();
    settings[key] = value;
    this.saveSettings(settings);
  }
}

class ApiService {
  private mockService = new MockApiService();
  private useMockService = this.shouldUseMockService();

  constructor() {
    console.log('🔧 API Service 初始化');
    console.log('📊 环境信息:', {
      isDev: import.meta.env.DEV,
      mode: import.meta.env.MODE,
      useMockAPI: import.meta.env.VITE_USE_MOCK_API,
      forceLocal: localStorage.getItem('diary_force_local')
    });
    console.log(`🎯 使用 ${this.useMockService ? 'Mock' : '远程'} API 服务`);
  }

  private shouldUseMockService(): boolean {
    // 检查是否在开发环境且没有后端服务
    const isDev = import.meta.env.DEV;
    const useMock = import.meta.env.VITE_USE_MOCK_API === 'true';
    const forceLocal = localStorage.getItem('diary_force_local') === 'true';
    const mode = import.meta.env.MODE;

    // 如果是mock模式，强制使用Mock服务
    if (mode === 'mock') return true;

    // 如果明确设置了使用Mock API，使用Mock服务
    if (useMock) return true;

    // 如果用户强制设置了本地模式，使用Mock服务
    if (forceLocal) return true;

    // 在开发环境下，默认使用Mock服务（避免远程依赖）
    if (isDev) return true;

    return false;
  }

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
    if (this.useMockService) {
      return this.mockService.getAllEntries();
    }

    try {
      const response = await this.request<DiaryEntry[]>('/entries');
      return response.data || [];
    } catch (error) {
      console.warn('远程API调用失败，切换到本地Mock服务:', error);
      this.useMockService = true;
      return this.mockService.getAllEntries();
    }
  }

  // 获取单个日记
  async getEntry(id: number): Promise<DiaryEntry | null> {
    if (this.useMockService) {
      return this.mockService.getEntry(id);
    }

    try {
      const response = await this.request<DiaryEntry>(`/entries/${id}`);
      return response.data || null;
    } catch (error) {
      console.warn('远程API调用失败，切换到本地Mock服务:', error);
      this.useMockService = true;
      return this.mockService.getEntry(id);
    }
  }

  // 创建日记
  async createEntry(entry: Omit<DiaryEntry, 'id' | 'created_at' | 'updated_at'>): Promise<DiaryEntry> {
    if (this.useMockService) {
      return this.mockService.createEntry(entry);
    }

    try {
      const response = await this.request<DiaryEntry>('/entries', {
        method: 'POST',
        body: JSON.stringify(entry),
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || '创建失败');
      }

      return response.data;
    } catch (error) {
      console.warn('远程API调用失败，切换到本地Mock服务:', error);
      this.useMockService = true;
      return this.mockService.createEntry(entry);
    }
  }

  // 更新日记
  async updateEntry(id: number, entry: Partial<DiaryEntry>): Promise<DiaryEntry> {
    if (this.useMockService) {
      return this.mockService.updateEntry(id, entry);
    }

    try {
      const response = await this.request<DiaryEntry>(`/entries/${id}`, {
        method: 'PUT',
        body: JSON.stringify(entry),
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || '更新失败');
      }

      return response.data;
    } catch (error) {
      console.warn('远程API调用失败，切换到本地Mock服务:', error);
      this.useMockService = true;
      return this.mockService.updateEntry(id, entry);
    }
  }

  // 删除日记
  async deleteEntry(id: number): Promise<void> {
    if (this.useMockService) {
      return this.mockService.deleteEntry(id);
    }

    try {
      const response = await this.request(`/entries/${id}`, {
        method: 'DELETE',
      });

      if (!response.success) {
        throw new Error(response.error || '删除失败');
      }
    } catch (error) {
      console.warn('远程API调用失败，切换到本地Mock服务:', error);
      this.useMockService = true;
      return this.mockService.deleteEntry(id);
    }
  }

  // 批量导入日记
  async batchImportEntries(entries: DiaryEntry[]): Promise<DiaryEntry[]> {
    if (this.useMockService) {
      return this.mockService.batchImportEntries(entries);
    }

    try {
      const response = await this.request<DiaryEntry[]>('/entries/batch', {
        method: 'POST',
        body: JSON.stringify({ entries }),
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || '导入失败');
      }

      return response.data;
    } catch (error) {
      console.warn('远程API调用失败，切换到本地Mock服务:', error);
      this.useMockService = true;
      return this.mockService.batchImportEntries(entries);
    }
  }

  // 批量更新日记
  async batchUpdateEntries(entries: DiaryEntry[]): Promise<DiaryEntry[]> {
    if (this.useMockService) {
      return this.mockService.batchUpdateEntries(entries);
    }

    try {
      const response = await this.request<DiaryEntry[]>('/entries/batch', {
        method: 'PUT',
        body: JSON.stringify({ entries }),
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || '批量更新失败');
      }

      return response.data;
    } catch (error) {
      console.warn('远程API调用失败，切换到本地Mock服务:', error);
      this.useMockService = true;
      return this.mockService.batchUpdateEntries(entries);
    }
  }

  // 获取所有设置
  async getAllSettings(): Promise<Record<string, string>> {
    if (this.useMockService) {
      return this.mockService.getAllSettings();
    }

    try {
      const response = await this.request<Record<string, string>>('/settings');
      return response.data || {};
    } catch (error) {
      console.warn('远程API调用失败，切换到本地Mock服务:', error);
      this.useMockService = true;
      return this.mockService.getAllSettings();
    }
  }

  // 获取单个设置
  async getSetting(key: string): Promise<string | null> {
    if (this.useMockService) {
      return this.mockService.getSetting(key);
    }

    try {
      const response = await this.request<Record<string, string>>(`/settings/${key}`);
      return response.data?.[key] || null;
    } catch (error) {
      console.warn('远程API调用失败，切换到本地Mock服务:', error);
      this.useMockService = true;
      return this.mockService.getSetting(key);
    }
  }

  // 更新设置
  async setSetting(key: string, value: string): Promise<void> {
    if (this.useMockService) {
      return this.mockService.setSetting(key, value);
    }

    try {
      const response = await this.request(`/settings/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ value }),
      });

      if (!response.success) {
        throw new Error(response.error || '设置更新失败');
      }
    } catch (error) {
      console.warn('远程API调用失败，切换到本地Mock服务:', error);
      this.useMockService = true;
      return this.mockService.setSetting(key, value);
    }
  }

  // 切换到本地模式
  enableLocalMode(): void {
    this.useMockService = true;
    localStorage.setItem('diary_force_local', 'true');
    console.log('已切换到本地Mock模式');
  }

  // 切换到远程模式
  enableRemoteMode(): void {
    this.useMockService = false;
    localStorage.removeItem('diary_force_local');
    console.log('已切换到远程API模式');
  }

  // 获取当前模式
  getCurrentMode(): 'local' | 'remote' {
    return this.useMockService ? 'local' : 'remote';
  }

  // 清除本地数据
  clearLocalData(): void {
    this.mockService = new MockApiService();
    localStorage.removeItem('diary_app_data');
    localStorage.removeItem('diary_app_settings');
    console.log('本地数据已清除');
  }
}

export const apiService = new ApiService();
