import { DiaryEntry, ApiResponse } from '../types';
import { withRetry, verifyDeletion, getConsistencyErrorMessage } from '../utils/d1Utils';

const API_BASE_URL = '/api';

// Mock数据服务，用于本地开发
class MockApiService {
  private readonly STORAGE_KEY = 'diary_app_data';
  private readonly SETTINGS_KEY = 'diary_app_settings';

  private getStoredEntries(): DiaryEntry[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }

      // 检查是否禁用默认数据
      const disableDefaults = localStorage.getItem('diary_disable_defaults') === 'true';
      return disableDefaults ? [] : this.getDefaultEntries();
    } catch {
      // 检查是否禁用默认数据
      const disableDefaults = localStorage.getItem('diary_disable_defaults') === 'true';
      return disableDefaults ? [] : this.getDefaultEntries();
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
      app_password: 'diary123',
      login_background_enabled: 'false',
      login_background_url: '',
      quick_filters_enabled: 'true',
      export_enabled: 'true',
      archive_view_enabled: 'true'
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
      location: entry.location || null,
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

  async batchImportEntries(newEntries: DiaryEntry[], options?: { overwrite?: boolean }): Promise<DiaryEntry[]> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const existingEntries = this.getStoredEntries();
    const importedEntries: DiaryEntry[] = [];

    // 先处理所有导入的条目
    for (const entry of newEntries) {
      const newEntry: DiaryEntry = {
        ...entry,
        id: this.generateId(),
        created_at: entry.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      importedEntries.push(newEntry);
    }

    let finalEntries: DiaryEntry[];

    if (options?.overwrite) {
      // 覆盖模式：只保留导入的数据，清除现有数据（包括默认数据）
      finalEntries = [...importedEntries];
      // 设置标志，避免重新显示默认数据
      localStorage.setItem('diary_disable_defaults', 'true');
    } else {
      // 合并模式：将导入的条目添加到现有条目中
      finalEntries = [...existingEntries, ...importedEntries];
    }

    // 按创建时间倒序排序，确保最新的在最前面
    finalEntries.sort((a, b) =>
      new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()
    );

    this.saveEntries(finalEntries);
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
    // API Service 初始化完成
  }

  // 重置API服务状态
  resetApiService(): void {
    this.useMockService = this.shouldUseMockService();
  }

  // 获取当前API服务状态
  getApiServiceStatus(): { useMockService: boolean; reason: string } {
    return {
      useMockService: this.useMockService,
      reason: this.useMockService ? 'Mock服务' : '远程API服务'
    };
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

      if (!response.success) {
        console.error('获取日记列表失败:', response.error);
        // 只有在明确的网络错误时才切换到Mock服务
        throw new Error(response.error || '获取日记列表失败');
      }

      return response.data || [];
    } catch (error) {
      console.error('获取日记列表失败:', error);

      // 检查是否是网络连接问题
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn('网络连接失败，切换到本地Mock服务');
        this.useMockService = true;
        return this.mockService.getAllEntries();
      }

      // 其他错误直接抛出，不切换到Mock服务
      throw error;
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

  // 更新日记 - 使用新的专用端点
  async updateEntry(id: number, entry: Partial<DiaryEntry>): Promise<DiaryEntry> {
    if (this.useMockService) {
      return this.mockService.updateEntry(id, entry);
    }

    try {
      // 如果只是切换隐藏状态，使用专用的隐藏端点
      if (Object.keys(entry).length === 1 && 'hidden' in entry) {
        return await this.toggleEntryVisibility(id);
      }

      // 否则使用编辑端点
      const response = await this.request<DiaryEntry>(`/entries/${id}/edit`, {
        method: 'POST',
        body: JSON.stringify(entry),
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || '更新失败');
      }

      return response.data;
    } catch (error) {
      console.error('更新日记失败:', error);
      throw error;
    }
  }

  // 切换日记隐藏状态 - 专用方法
  async toggleEntryVisibility(id: number): Promise<DiaryEntry> {
    if (this.useMockService) {
      // 获取当前状态并切换
      const current = await this.mockService.getEntry(id);
      if (!current) throw new Error('日记不存在');
      return this.mockService.updateEntry(id, { hidden: !current.hidden });
    }

    try {
      const response = await this.request<DiaryEntry>(`/entries/${id}/toggle-visibility`, {
        method: 'POST',
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || '切换隐藏状态失败');
      }

      return response.data;
    } catch (error) {
      console.error('切换隐藏状态失败:', error);
      throw error;
    }
  }

  // 删除日记
  async deleteEntry(id: number): Promise<void> {
    if (this.useMockService) {
      return this.mockService.deleteEntry(id);
    }

    try {
      // 使用重试机制执行删除操作
      await withRetry(async () => {
        const response = await this.request(`/entries/${id}`, {
          method: 'DELETE',
        });

        if (!response.success) {
          throw new Error(response.error || '删除失败');
        }
      }, { maxRetries: 2, baseDelay: 100 });

      // 验证删除是否成功
      const isDeleted = await verifyDeletion(async () => {
        try {
          await this.request(`/entries/${id}`);
          // 如果能获取到数据，说明还没删除
          return false;
        } catch (error) {
          // 如果获取失败（404），说明删除成功
          return error instanceof Error && error.message.includes('不存在');
        }
      }, { maxRetries: 5, baseDelay: 200 });

      if (!isDeleted) {
        console.warn(`删除操作可能需要更多时间同步，ID: ${id}`);
        // 不抛出错误，让用户知道操作正在进行中
      }

    } catch (error) {
      const errorMessage = getConsistencyErrorMessage(error instanceof Error ? error : new Error(String(error)));
      console.warn('远程API调用失败:', errorMessage);

      // 如果是一致性问题，不切换到Mock服务
      if (errorMessage.includes('同步')) {
        throw new Error(errorMessage);
      }

      // 其他错误切换到Mock服务
      this.useMockService = true;
      return this.mockService.deleteEntry(id);
    }
  }

  // 批量导入日记
  async batchImportEntries(entries: DiaryEntry[], options?: { overwrite?: boolean }): Promise<DiaryEntry[]> {
    if (this.useMockService) {
      return this.mockService.batchImportEntries(entries, options);
    }

    try {
      const response = await this.request<DiaryEntry[]>('/entries/batch', {
        method: 'POST',
        body: JSON.stringify({ entries, options }),
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || '导入失败');
      }

      return response.data;
    } catch (error) {
      console.warn('远程API调用失败，切换到本地Mock服务:', error);
      this.useMockService = true;
      return this.mockService.batchImportEntries(entries, options);
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
  }

  // 切换到远程模式
  enableRemoteMode(): void {
    this.useMockService = false;
    localStorage.removeItem('diary_force_local');
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
    // 清除数据后禁用默认数据，避免重新显示示例数据
    localStorage.setItem('diary_disable_defaults', 'true');
  }

  // 启用/禁用默认示例数据
  setDefaultDataEnabled(enabled: boolean): void {
    if (enabled) {
      localStorage.removeItem('diary_disable_defaults');
    } else {
      localStorage.setItem('diary_disable_defaults', 'true');
    }
  }
}

export const apiService = new ApiService();
