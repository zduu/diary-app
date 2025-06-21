import { useState, useEffect } from 'react';
import { DiaryEntry } from '../types';
import { apiService } from '../services/api';

export function useDiary() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getAllEntries();
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const createEntry = async (entry: Omit<DiaryEntry, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newEntry = await apiService.createEntry(entry);
      setEntries(prev => [newEntry, ...prev]);
      return newEntry;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : '创建失败');
    }
  };

  const updateEntry = async (id: number, entry: Partial<DiaryEntry>) => {
    try {
      const updatedEntry = await apiService.updateEntry(id, entry);
      setEntries(prev => prev.map(e => e.id === id ? updatedEntry : e));
      return updatedEntry;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : '更新失败');
    }
  };

  const deleteEntry = async (id: number) => {
    try {
      // 先乐观更新UI
      setEntries(prev => prev.filter(e => e.id !== id));

      await apiService.deleteEntry(id);

      // 等待一段时间确保数据同步
      await new Promise(resolve => setTimeout(resolve, 500));

      // 重新加载数据以确保一致性
      try {
        await loadEntries();
      } catch (reloadError) {
        console.warn('重新加载数据失败，但删除操作可能已成功:', reloadError);
      }

    } catch (err) {
      // 如果删除失败，重新加载数据以恢复正确状态
      await loadEntries();
      throw new Error(err instanceof Error ? err.message : '删除失败');
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  return {
    entries,
    loading,
    error,
    createEntry,
    updateEntry,
    deleteEntry,
    refreshEntries: loadEntries,
  };
}
