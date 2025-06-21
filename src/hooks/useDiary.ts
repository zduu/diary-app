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
      await apiService.deleteEntry(id);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
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
