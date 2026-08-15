import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 数据库文件路径
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/tokenloan.db')

// 确保data目录存在
import fs from 'fs'
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

// 申请表
db.exec(`
  CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    product_type TEXT NOT NULL CHECK(product_type IN ('token', 'compute', 'opc', 'consult')),
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    annual_compute_cost INTEGER DEFAULT 0,
    annual_token_cost INTEGER DEFAULT 0,
    ip_count INTEGER DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'reviewing', 'approved', 'rejected', 'withdrawn')),
    estimated_amount INTEGER DEFAULT 0,
    reviewed_by TEXT,
    review_note TEXT,
    reviewed_at TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`)

// 政策内容表（CMS可管理）
db.exec(`
  CREATE TABLE IF NOT EXISTS policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    date TEXT,
    description TEXT,
    source_url TEXT,
    highlights TEXT,
    icon_type TEXT DEFAULT 'blue',
    is_latest INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    status TEXT DEFAULT 'published' CHECK(status IN ('published', 'draft', 'archived')),
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  )
`)

// 产品内容表
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    subtitle TEXT,
    badge TEXT,
    header_class TEXT,
    features TEXT,
    sort_order INTEGER DEFAULT 0,
    status TEXT DEFAULT 'published' CHECK(status IN ('published', 'draft', 'archived')),
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  )
`)

// 案例内容表
db.exec(`
  CREATE TABLE IF NOT EXISTS cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    tag TEXT,
    tag_class TEXT,
    description TEXT,
    stat_text TEXT,
    stat_icon TEXT,
    bg_class TEXT,
    icon_class TEXT,
    sort_order INTEGER DEFAULT 0,
    status TEXT DEFAULT 'published' CHECK(status IN ('published', 'draft', 'archived')),
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

// 初始化政策数据
const policyCount = db.prepare('SELECT COUNT(*) as count FROM policies').get()
if (policyCount.count === 0) {
  const insertPolicy = db.prepare(`
    INSERT INTO policies (title, date, description, source_url, highlights, icon_type, is_latest, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const policies = [
    {
      title: '《北京市关于加快智能体引领发展的若干措施》',
      date: '2026年7月',
      description: '北京市四部门联合印发，明确鼓励发展Token经济，支持银行、保险等金融机构开发支持智能体落地的金融产品。鼓励词元应用商业模式创新。',
      source_url: 'https://www.beijing.gov.cn/zhengce/zhengcefagui/202607/t20260723_4781085.html',
      highlights: JSON.stringify(['鼓励发展Token经济', '支持金融机构开发金融产品', '鼓励词元应用商业模式创新', '支持智能体落地应用']),
      icon_type: 'purple', is_latest: 1, sort_order: 1
    },
    {
      title: '亦庄"词元十条" —— 全市首个词元经济专项政策',
      date: '2026年8月7日',
      description: '北京经济技术开发区发布，每年发放算力券、数据券各1亿元，按算力租赁费用30%给予最高2000万元资金支持；每年发放1亿元模型券或词元券，按词元消耗费用50%给予最高500万元支持。',
      source_url: 'https://www.ncsti.gov.cn/kjdt/scyq/bjjjjskfq/jkdt/202608/t20260807_252627.html',
      highlights: JSON.stringify(['算力券+数据券各1亿元/年', '算力租赁30%补贴，最高2000万', '词元券1亿元/年，50%支持最高500万', 'OPC社区专项扶持']),
      icon_type: 'blue', is_latest: 1, sort_order: 2
    },
    {
      title: 'OPC创新发展行动方案',
      date: '2026年',
      description: '"词元十条"专门针对OPC（一人公司）创业者，OPC社区超4万平米服务超500家主体，提供"即用即补"模型券兑现平台。',
      source_url: 'https://www.beijing.gov.cn/zhengce/zhengcefagui/202606/t20260622_4710194.html',
      highlights: JSON.stringify(['OPC社区超4万平米', '服务超500家OPC主体', '"即用即补"模型券兑现平台', 'OPC贷专属信贷产品']),
      icon_type: 'cyan', is_latest: 0, sort_order: 3
    }
  ]

  for (const p of policies) {
    insertPolicy.run(p.title, p.date, p.description, p.source_url, p.highlights, p.icon_type, p.is_latest, p.sort_order)
  }
  console.log('📋 政策数据已初始化')
}

// 初始化产品数据
const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get()
if (productCount.count === 0) {
  const insertProduct = db.prepare(`
    INSERT INTO products (code, name, subtitle, badge, header_class, features, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const products = [
    {
      code: 'token', name: 'Token贷', subtitle: '按Token消耗额度核定授信',
      badge: '核心产品', header_class: 'token',
      features: JSON.stringify([
        '基于Kai TPM期货交易数据核定授信',
        '按TPM·h（每分钟令牌负载×小时）计量消耗',
        '参考广州模式，聚焦北京词元经济生态',
        '适用对象：AI算力企业、大模型公司',
        '担保方式：Kai平台Token消耗数据增信'
      ]),
      sort_order: 1
    },
    {
      code: 'compute', name: '算力贷', subtitle: '按算力租赁费用30%最高2000万补贴',
      badge: '补贴支持', header_class: 'compute',
      features: JSON.stringify([
        '算力券+数据券各1亿元/年',
        '按算力租赁费用30%给予资金支持',
        '最高2000万元补贴额度',
        'Kai平台提供容量注册与交付确认数据',
        '适用对象：Kai认证容量供应商、智算企业'
      ]),
      sort_order: 2
    },
    {
      code: 'opc', name: 'OPC贷', subtitle: '综合Token消耗+征信+知识产权增信',
      badge: '北京特色', header_class: 'opc',
      features: JSON.stringify([
        '专为OPC（一人公司）创业者设计',
        '综合Kai TPM消耗数据+征信+知识产权',
        '赛事获奖记录增信',
        'Kai聚合商支持中小OPC批量采购容量',
        '词元券按消耗50%最高500万支持'
      ]),
      sort_order: 3
    }
  ]

  for (const p of products) {
    insertProduct.run(p.code, p.name, p.subtitle, p.badge, p.header_class, p.features, p.sort_order)
  }
  console.log('📦 产品数据已初始化')
}

// 初始化案例数据
const caseCount = db.prepare('SELECT COUNT(*) as count FROM cases').get()
if (caseCount.count === 0) {
  const insertCase = db.prepare(`
    INSERT INTO cases (title, tag, tag_class, description, stat_text, stat_icon, bg_class, icon_class, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const cases = [
    {
      title: '行云科技 · 超百亿授信',
      tag: '算力贷 + Kai容量注册',
      tag_class: '',
      description: '2026年8月，行云科技作为Kai认证容量供应商，通过容量注册提前锁定未来收入，同时获得算力贷超百亿授信专项用于北京智算集群建设，按算力租赁费用30%获得资金补贴。',
      stat_text: '授信规模：120亿元 ｜ 获批时间：2026年8月',
      stat_icon: 'fa-chart-line', bg_class: 'bg1', icon_class: 'fa-server', sort_order: 1
    },
    {
      title: '模数OPC社区 · 词元券赋能',
      tag: 'OPC贷 + Kai聚合商',
      tag_class: '',
      description: '2026年7月入驻OPC社区，创业者通过Kai聚合商批量采购TPM容量，使用词元券按消耗50%获得补贴，首月即节省47万元AI推理调用成本，预计全年节省超180万元。',
      stat_text: '首月省47万 ｜ 年化预计180万+ ｜ 入驻：2026年7月',
      stat_icon: 'fa-piggy-bank', bg_class: 'bg2', icon_class: 'fa-user-astronaut', sort_order: 2
    },
    {
      title: '招商银行 · "招金贷"服务',
      tag: '银行合作 + Kai结算',
      tag_class: '',
      description: '2026年6月上线，招商银行北京分行推出"招金贷"，依托Kai平台TPM结算数据评估企业模型服务采购量，首批发放信用额度超8亿元，附带Token权益工程师信用卡，已服务超230家科技企业。',
      stat_text: '首批授信8亿+ ｜ 服务企业230+ ｜ 上线：2026年6月',
      stat_icon: 'fa-credit-card', bg_class: 'bg3', icon_class: 'fa-university', sort_order: 3
    }
  ]

  for (const c of cases) {
    insertCase.run(c.title, c.tag, c.tag_class, c.description, c.stat_text, c.stat_icon, c.bg_class, c.icon_class, c.sort_order)
  }
  console.log('🏆 案例数据已初始化')
}

export default db
