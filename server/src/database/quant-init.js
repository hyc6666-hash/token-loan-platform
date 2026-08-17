import Database from './sqlite-compat.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/tokenloan.db')
const db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

console.log('📦 量化交易数据库表初始化...')

// ============ 模型参考表 ============
db.exec(`
  CREATE TABLE IF NOT EXISTS quant_models (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    base_price REAL NOT NULL,
    category TEXT DEFAULT 'llm',
    context_window INTEGER DEFAULT 128000,
    tpm_rating INTEGER DEFAULT 1000000,
    regions TEXT DEFAULT '["SG1","EU1","US1","CN1","HK1","JP1"]',
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  )
`)

// ============ 行情数据表 ============
db.exec(`
  CREATE TABLE IF NOT EXISTS quant_market_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_code TEXT NOT NULL,
    region TEXT NOT NULL,
    price REAL NOT NULL,
    volume REAL DEFAULT 0,
    bid REAL,
    ask REAL,
    market_type TEXT DEFAULT 'spot' CHECK(market_type IN ('spot', 'forward', 'retail', 'c2c')),
    delivery_date TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (model_code) REFERENCES quant_models(code)
  )
`)

// ============ K线数据表 ============
db.exec(`
  CREATE TABLE IF NOT EXISTS quant_candles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_code TEXT NOT NULL,
    region TEXT DEFAULT 'SG1',
    timeframe TEXT DEFAULT '1h' CHECK(timeframe IN ('1m', '5m', '15m', '1h', '4h', '1d')),
    open REAL NOT NULL,
    high REAL NOT NULL,
    low REAL NOT NULL,
    close REAL NOT NULL,
    volume REAL DEFAULT 0,
    timestamp TEXT NOT NULL,
    UNIQUE(model_code, region, timeframe, timestamp)
  )
`)

// ============ 用户资金配置 ============
db.exec(`
  CREATE TABLE IF NOT EXISTS quant_capital (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    total_capital REAL NOT NULL DEFAULT 0,
    available_capital REAL NOT NULL DEFAULT 0,
    frozen_capital REAL NOT NULL DEFAULT 0,
    risk_tolerance TEXT DEFAULT 'moderate' CHECK(risk_tolerance IN ('conservative', 'moderate', 'aggressive', 'extreme')),
    max_single_position REAL DEFAULT 0.1,
    max_total_exposure REAL DEFAULT 0.8,
    daily_loss_limit REAL DEFAULT 0.05,
    max_drawdown REAL DEFAULT 0.15,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`)

// ============ 订单表 ============
db.exec(`
  CREATE TABLE IF NOT EXISTS quant_orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    model_code TEXT NOT NULL,
    region TEXT DEFAULT 'SG1',
    side TEXT NOT NULL CHECK(side IN ('buy', 'sell')),
    order_type TEXT DEFAULT 'limit' CHECK(order_type IN ('market', 'limit', 'stop', 'stop_limit')),
    price REAL NOT NULL,
    quantity REAL NOT NULL,
    filled_quantity REAL DEFAULT 0,
    avg_fill_price REAL DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'partial', 'filled', 'cancelled', 'rejected')),
    strategy_id TEXT,
    contract_type TEXT DEFAULT 'firm' CHECK(contract_type IN ('firm', 'protected')),
    delivery_date TEXT,
    time_in_force TEXT DEFAULT 'GTC' CHECK(time_in_force IN ('GTC', 'IOC', 'FOK', 'GTD')),
    expires_at TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`)

// ============ 持仓表 ============
db.exec(`
  CREATE TABLE IF NOT EXISTS quant_positions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    model_code TEXT NOT NULL,
    region TEXT DEFAULT 'SG1',
    side TEXT NOT NULL CHECK(side IN ('long', 'short')),
    quantity REAL NOT NULL DEFAULT 0,
    avg_price REAL NOT NULL DEFAULT 0,
    current_price REAL DEFAULT 0,
    unrealized_pnl REAL DEFAULT 0,
    realized_pnl REAL DEFAULT 0,
    margin REAL DEFAULT 0,
    leverage REAL DEFAULT 1,
    liquidation_price REAL,
    strategy_id TEXT,
    status TEXT DEFAULT 'open' CHECK(status IN ('open', 'closed')),
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`)

// ============ 策略表 ============
db.exec(`
  CREATE TABLE IF NOT EXISTS quant_strategies (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN (
      'cross_model_arb',
      'time_region_arb',
      'trend_following',
      'mean_reversion',
      'market_making',
      'forward_spot_arb',
      'multi_strategy'
    )),
    config TEXT,
    allocated_capital REAL DEFAULT 0,
    expected_return REAL DEFAULT 0,
    max_risk REAL DEFAULT 0,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'paused', 'stopped', 'completed')),
    auto_execute INTEGER DEFAULT 0,
    ai_recommended INTEGER DEFAULT 0,
    performance_data TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`)

// ============ 风控规则表 ============
db.exec(`
  CREATE TABLE IF NOT EXISTS quant_risk_rules (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    rule_type TEXT NOT NULL CHECK(rule_type IN (
      'max_single_position',
      'max_total_exposure',
      'daily_loss_limit',
      'max_drawdown',
      'max_leverage',
      'min_liquidity',
      'max_correlation',
      'margin_call',
      'forced_liquidation',
      'circuit_breaker',
      'overnight_limit',
      'model_concentration'
    )),
    threshold REAL NOT NULL,
    current_value REAL DEFAULT 0,
    severity TEXT DEFAULT 'info' CHECK(severity IN ('info', 'warning', 'critical', 'breach')),
    action TEXT DEFAULT 'alert' CHECK(action IN ('alert', 'reduce', 'halt', 'liquidate')),
    enabled INTEGER DEFAULT 1,
    triggered_at TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`)

// ============ 风控告警表 ============
db.exec(`
  CREATE TABLE IF NOT EXISTS quant_risk_alerts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('info', 'warning', 'critical', 'breach')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data TEXT,
    acknowledged INTEGER DEFAULT 0,
    acknowledged_at TEXT,
    resolved INTEGER DEFAULT 0,
    resolved_at TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`)

// ============ 交易记录表 ============
db.exec(`
  CREATE TABLE IF NOT EXISTS quant_trades (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    order_id TEXT,
    model_code TEXT NOT NULL,
    region TEXT DEFAULT 'SG1',
    side TEXT NOT NULL CHECK(side IN ('buy', 'sell')),
    price REAL NOT NULL,
    quantity REAL NOT NULL,
    value REAL NOT NULL,
    pnl REAL DEFAULT 0,
    fee REAL DEFAULT 0,
    strategy_id TEXT,
    strategy_type TEXT,
    contract_type TEXT DEFAULT 'firm',
    delivery_date TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`)

// ============ API设置表 ============
db.exec(`
  CREATE TABLE IF NOT EXISTS quant_api_settings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    platform TEXT NOT NULL CHECK(platform IN ('london', 'hongkong')),
    api_key TEXT,
    api_secret TEXT,
    base_url TEXT,
    ws_url TEXT,
    status TEXT DEFAULT 'inactive' CHECK(status IN ('active', 'inactive', 'error')),
    last_tested_at TEXT,
    last_error TEXT,
    permissions TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`)

// ============ 策略信号表 ============
db.exec(`
  CREATE TABLE IF NOT EXISTS quant_signals (
    id TEXT PRIMARY KEY,
    strategy_id TEXT,
    user_id TEXT NOT NULL,
    model_code TEXT NOT NULL,
    region TEXT DEFAULT 'SG1',
    signal_type TEXT NOT NULL CHECK(signal_type IN ('buy', 'sell', 'hold', 'close')),
    strength REAL DEFAULT 0,
    price REAL,
    indicator_data TEXT,
    reasoning TEXT,
    executed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`)

// ============ 初始化模型数据 ============
const modelCount = db.prepare('SELECT COUNT(*) as count FROM quant_models').get()
if (modelCount.count === 0) {
  const { v4: uuidv4 } = await import('uuid')
  const insertModel = db.prepare(`
    INSERT INTO quant_models (id, code, name, provider, base_price, category, context_window, tpm_rating, regions, description, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const models = [
    {
      id: uuidv4(), code: 'GLM-5.2', name: 'GLM-5.2', provider: '智谱AI',
      base_price: 23101, category: 'llm', context_window: 128000, tpm_rating: 1000000,
      regions: JSON.stringify(['SG1', 'EU1', 'US1', 'CN1', 'HK1', 'JP1']),
      description: '智谱AI旗舰模型，通用能力强，推理与创作均衡', sort_order: 1
    },
    {
      id: uuidv4(), code: 'DeepSeek-V4', name: 'DeepSeek-V4', provider: '深度求索',
      base_price: 9860, category: 'llm', context_window: 128000, tpm_rating: 1000000,
      regions: JSON.stringify(['SG1', 'EU1', 'US1', 'CN1', 'HK1', 'JP1']),
      description: '深度求索高性价比模型，代码与数学推理突出', sort_order: 2
    },
    {
      id: uuidv4(), code: 'Qwen3-Max', name: 'Qwen3-Max', provider: '阿里通义',
      base_price: 15427, category: 'llm', context_window: 256000, tpm_rating: 1000000,
      regions: JSON.stringify(['SG1', 'EU1', 'US1', 'CN1', 'HK1', 'JP1']),
      description: '阿里通义千问旗舰，多语言与长上下文优势', sort_order: 3
    },
    {
      id: uuidv4(), code: 'Kimi-K3', name: 'Kimi-K3', provider: '月之暗面',
      base_price: 18769, category: 'llm', context_window: 2000000, tpm_rating: 1000000,
      regions: JSON.stringify(['SG1', 'EU1', 'US1', 'CN1', 'HK1', 'JP1']),
      description: '月之暗面超长上下文模型，文档处理与对话领先', sort_order: 4
    }
  ]

  for (const m of models) {
    insertModel.run(m.id, m.code, m.name, m.provider, m.base_price, m.category, m.context_window, m.tpm_rating, m.regions, m.description, m.sort_order)
  }
  console.log('📊 模型数据已初始化 (4个模型)')
}

// ============ 初始化风控规则模板 ============
const ruleCount = db.prepare('SELECT COUNT(*) as count FROM quant_risk_rules').get()
if (ruleCount.count === 0) {
  const { v4: uuidv4 } = await import('uuid')
  const insertRule = db.prepare(`
    INSERT INTO quant_risk_rules (id, user_id, rule_type, threshold, current_value, severity, action, enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  // 为管理员创建默认风控规则模板
  const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get()
  if (adminUser) {
    const defaultRules = [
      { type: 'max_single_position', threshold: 0.10, severity: 'warning', action: 'alert' },
      { type: 'max_total_exposure', threshold: 0.80, severity: 'warning', action: 'reduce' },
      { type: 'daily_loss_limit', threshold: 0.05, severity: 'critical', action: 'halt' },
      { type: 'max_drawdown', threshold: 0.15, severity: 'critical', action: 'halt' },
      { type: 'max_leverage', threshold: 3.0, severity: 'critical', action: 'liquidate' },
      { type: 'model_concentration', threshold: 0.40, severity: 'warning', action: 'alert' },
      { type: 'margin_call', threshold: 0.30, severity: 'critical', action: 'alert' },
      { type: 'forced_liquidation', threshold: 0.15, severity: 'breach', action: 'liquidate' },
      { type: 'circuit_breaker', threshold: 0.10, severity: 'critical', action: 'halt' },
      { type: 'overnight_limit', threshold: 0.50, severity: 'warning', action: 'reduce' }
    ]

    for (const r of defaultRules) {
      insertRule.run(uuidv4(), adminUser.id, r.type, r.threshold, 0, r.severity, r.action, 1)
    }
    console.log('🛡️ 风控规则模板已初始化 (10条规则)')
  }
}

// ============ 索引 ============
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_market_data_model ON quant_market_data(model_code, timestamp);
  CREATE INDEX IF NOT EXISTS idx_candles_lookup ON quant_candles(model_code, region, timeframe, timestamp);
  CREATE INDEX IF NOT EXISTS idx_orders_user ON quant_orders(user_id, status, created_at);
  CREATE INDEX IF NOT EXISTS idx_positions_user ON quant_positions(user_id, status);
  CREATE INDEX IF NOT EXISTS idx_strategies_user ON quant_strategies(user_id, status);
  CREATE INDEX IF NOT EXISTS idx_risk_alerts_user ON quant_risk_alerts(user_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_trades_user ON quant_trades(user_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_signals_strategy ON quant_signals(strategy_id, created_at);
`)

console.log('✅ 量化交易数据库表初始化完成')
export default db
