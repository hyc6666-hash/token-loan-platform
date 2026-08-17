import Database from './sqlite-compat.js'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 数据库文件路径
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/tokenloan.db')

// 确保data目录存在
const dataDir = path.dirname(DB_PATH)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// 创建数据库连接
const db = new Database(DB_PATH)

// 启用WAL模式（提升并发性能）
db.pragma('journal_mode = WAL')
// 启用外键约束
db.pragma('foreign_keys = ON')

console.log(`📦 数据库连接: ${DB_PATH}`)

// ============ 建表 ============

// 用户表（企业用户）
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    password_hash TEXT NOT NULL,
    company_type TEXT DEFAULT 'ai',
    region_beijing INTEGER DEFAULT 1,
    role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'disabled')),
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  )
`)

// ============ 初始化种子数据 ============

// 检查是否已有数据
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get()
if (userCount.count === 0) {
  // 创建管理员账号（密码: admin123）
  const bcrypt = await import('bcryptjs')
  const { v4: uuidv4 } = await import('uuid')
  const adminId = uuidv4()
  const adminHash = bcrypt.default.hashSync('admin123', 10)

  db.prepare(`
    INSERT INTO users (id, company_name, contact_name, phone, password_hash, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(adminId, '平台管理', '管理员', '13800000000', adminHash, 'admin')

  console.log('👤 管理员账号已创建: 手机 13800000000 / 密码 admin123')
}

export default db
