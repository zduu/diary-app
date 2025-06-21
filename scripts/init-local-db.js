#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔄 初始化本地D1数据库...');

try {
  // 确保.wrangler目录存在
  const wranglerDir = path.join(__dirname, '..', '.wrangler');
  if (!fs.existsSync(wranglerDir)) {
    fs.mkdirSync(wranglerDir, { recursive: true });
  }

  // 初始化本地数据库
  execSync('npx wrangler d1 execute diary-db --local --file=schema.sql', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });

  console.log('✅ 本地D1数据库初始化完成！');
} catch (error) {
  console.error('❌ 数据库初始化失败:', error.message);
  process.exit(1);
}
