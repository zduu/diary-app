import { DiaryEntry, Env } from './types';

export class DiaryDatabase {
  constructor(private db: D1Database) {}

  async getAllEntries(): Promise<DiaryEntry[]> {
    const { results } = await this.db.prepare(
      'SELECT * FROM diary_entries ORDER BY created_at DESC'
    ).all();
    
    return results.map(this.formatEntry);
  }

  async getEntry(id: number): Promise<DiaryEntry | null> {
    const result = await this.db.prepare(
      'SELECT * FROM diary_entries WHERE id = ?'
    ).bind(id).first();
    
    return result ? this.formatEntry(result) : null;
  }

  async createEntry(entry: Omit<DiaryEntry, 'id' | 'created_at' | 'updated_at'>): Promise<DiaryEntry> {
    const tagsJson = JSON.stringify(entry.tags || []);
    const imagesJson = JSON.stringify(entry.images || []);

    const result = await this.db.prepare(`
      INSERT INTO diary_entries (title, content, content_type, mood, weather, images, tags, hidden)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      entry.title,
      entry.content,
      entry.content_type || 'markdown',
      entry.mood || 'neutral',
      entry.weather || 'unknown',
      imagesJson,
      tagsJson,
      entry.hidden ? 1 : 0
    ).first();

    return this.formatEntry(result);
  }

  async updateEntry(id: number, entry: Partial<DiaryEntry>): Promise<DiaryEntry | null> {
    const existing = await this.getEntry(id);
    if (!existing) return null;

    const tagsJson = entry.tags ? JSON.stringify(entry.tags) : undefined;
    const imagesJson = entry.images ? JSON.stringify(entry.images) : undefined;

    const result = await this.db.prepare(`
      UPDATE diary_entries
      SET title = COALESCE(?, title),
          content = COALESCE(?, content),
          content_type = COALESCE(?, content_type),
          mood = COALESCE(?, mood),
          weather = COALESCE(?, weather),
          images = COALESCE(?, images),
          tags = COALESCE(?, tags),
          hidden = COALESCE(?, hidden),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `).bind(
      entry.title || null,
      entry.content || null,
      entry.content_type || null,
      entry.mood || null,
      entry.weather || null,
      imagesJson || null,
      tagsJson || null,
      entry.hidden !== undefined ? (entry.hidden ? 1 : 0) : null,
      id
    ).first();

    return result ? this.formatEntry(result) : null;
  }

  async deleteEntry(id: number): Promise<boolean> {
    const result = await this.db.prepare(
      'DELETE FROM diary_entries WHERE id = ?'
    ).bind(id).run();
    
    return result.changes > 0;
  }

  async batchImportEntries(entries: DiaryEntry[]): Promise<DiaryEntry[]> {
    // 清空现有数据并导入新数据
    await this.db.prepare('DELETE FROM diary_entries').run();

    const results: DiaryEntry[] = [];

    for (const entry of entries) {
      const stmt = this.db.prepare(`
        INSERT INTO diary_entries (title, content, content_type, mood, weather, images, created_at, updated_at, tags, hidden)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = await stmt.run(
        entry.title || '',
        entry.content,
        entry.content_type || 'markdown',
        entry.mood || null,
        entry.weather || null,
        JSON.stringify(entry.images || []),
        entry.created_at || new Date().toISOString(),
        entry.updated_at || new Date().toISOString(),
        JSON.stringify(entry.tags || []),
        entry.hidden ? 1 : 0
      );

      if (result.success) {
        const newEntry = await this.getEntry(result.meta.last_row_id as number);
        if (newEntry) {
          results.push(newEntry);
        }
      }
    }

    return results;
  }

  async batchUpdateEntries(entries: DiaryEntry[]): Promise<DiaryEntry[]> {
    const results: DiaryEntry[] = [];

    for (const entry of entries) {
      if (entry.id) {
        const updated = await this.updateEntry(entry.id, entry);
        if (updated) {
          results.push(updated);
        }
      }
    }

    return results;
  }

  // 获取设置
  async getSetting(key: string): Promise<string | null> {
    const result = await this.db.prepare(
      'SELECT setting_value FROM app_settings WHERE setting_key = ?'
    ).bind(key).first();

    return result ? result.setting_value : null;
  }

  // 设置值
  async setSetting(key: string, value: string): Promise<void> {
    await this.db.prepare(`
      INSERT OR REPLACE INTO app_settings (setting_key, setting_value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `).bind(key, value).run();
  }

  // 获取所有设置
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

  private formatEntry(row: any): DiaryEntry {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      content_type: row.content_type || 'markdown',
      mood: row.mood,
      weather: row.weather,
      images: JSON.parse(row.images || '[]'),
      created_at: row.created_at,
      updated_at: row.updated_at,
      tags: JSON.parse(row.tags || '[]'),
      hidden: Boolean(row.hidden)
    };
  }
}
