-- 日记条目表
CREATE TABLE IF NOT EXISTS diary_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'markdown', -- markdown, plain
    mood TEXT DEFAULT 'neutral', -- happy, sad, neutral, excited, anxious, peaceful
    weather TEXT DEFAULT 'unknown', -- sunny, cloudy, rainy, snowy
    images TEXT DEFAULT '[]', -- JSON array of image URLs
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    tags TEXT DEFAULT '[]', -- JSON array of tags
    hidden INTEGER DEFAULT 0 -- 0 = visible, 1 = hidden (admin only)
);

-- 应用设置表
CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_diary_entries_created_at ON diary_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_diary_entries_mood ON diary_entries(mood);
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(setting_key);

-- 插入一些示例数据
INSERT INTO diary_entries (title, content, content_type, mood, weather, tags, images) VALUES
('公园散步的美好时光', '今天天气很好，和朋友一起去**公园散步**，心情特别愉快。

看到了很多美丽的花朵 🌸，还遇到了可爱的小狗 🐕。和朋友聊了很多有趣的话题。

> 生活中的小美好总是让人感到幸福', 'markdown', 'happy', 'sunny', '["散步", "朋友", "公园"]', '[]'),

('工作中的成长与收获', '今天在工作中遇到了一些挑战，但通过**团队合作**成功解决了问题。

学到了很多新的技术知识：
- React Hook 的高级用法
- TypeScript 类型推导
- 团队协作的重要性

感觉自己又成长了一些 💪', 'markdown', 'neutral', 'cloudy', '["工作", "学习", "团队"]', '[]'),

('雨天的宁静思考', '下雨天总是让人感到宁静，坐在窗边听雨声，思考人生的意义。

今天读了《人生的智慧》，收获颇丰。

*雨声滴答，思绪万千...*

有时候慢下来，静静地感受生活，也是一种幸福。', 'markdown', 'peaceful', 'rainy', '["读书", "思考", "雨天"]', '[]');

-- 插入默认设置
INSERT OR REPLACE INTO app_settings (setting_key, setting_value) VALUES
('admin_password', 'admin123'),
('app_password_enabled', 'false'),
('app_password', 'diary123');
