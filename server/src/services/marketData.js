/**
 * 行情数据服务
 * 
 * 基于 KAI 平台真实数据模拟行情：
 * - 4个模型：GLM-5.2, DeepSeek-V4, Qwen3-Max, Kimi-K3
 * - 6大区域：SG1, EU1, US1, CN1, HK1, JP1
 * - 峰谷分时定价
 * - K线数据生成
 */

import db from '../database/quant-init.js'
import { v4 as uuidv4 } from 'uuid'

// 区域峰谷系数（0=谷，1=峰）
const REGION_PEAK_HOURS = {
  SG1: { peak: [9, 10, 11, 14, 15, 16], valley: [0, 1, 2, 3, 4, 22, 23] },
  EU1: { peak: [9, 10, 11, 14, 15, 16, 17], valley: [0, 1, 2, 3, 4, 5, 22, 23] },
  US1: { peak: [9, 10, 11, 13, 14, 15], valley: [0, 1, 2, 3, 4, 5, 6, 22, 23] },
  CN1: { peak: [9, 10, 11, 14, 15, 16, 20, 21], valley: [0, 1, 2, 3, 4, 5, 23] },
  HK1: { peak: [9, 10, 11, 14, 15, 16], valley: [0, 1, 2, 3, 4, 22, 23] },
  JP1: { peak: [9, 10, 11, 14, 15, 16], valley: [0, 1, 2, 3, 4, 22, 23] }
}

// 区域价格调整系数
const REGION_PRICE_FACTOR = {
  SG1: 1.0, EU1: 1.08, US1: 1.12, CN1: 0.95, HK1: 1.03, JP1: 1.06
}

// 获取所有模型
export function getModels() {
  return db.prepare('SELECT * FROM quant_models WHERE status = ? ORDER BY sort_order').all('active')
}

// 获取模型详情
export function getModelByCode(code) {
  return db.prepare('SELECT * FROM quant_models WHERE code = ?').get(code)
}

// 计算当前时段价格（含峰谷调整）
function calculateCurrentPrice(basePrice, region, hour = new Date().getHours()) {
  const peakHours = REGION_PEAK_HOURS[region] || REGION_PEAK_HOURS.SG1
  const factor = REGION_PRICE_FACTOR[region] || 1.0
  
  let timeAdjust = 1.0
  if (peakHours.peak.includes(hour)) {
    timeAdjust = 1.0 + 0.15 + Math.random() * 0.05 // 峰时 +15-20%
  } else if (peakHours.valley.includes(hour)) {
    timeAdjust = 1.0 - 0.30 + Math.random() * 0.05 // 谷时 -25-30%
  } else {
    timeAdjust = 1.0 + (Math.random() - 0.5) * 0.04 // 平时 ±2%
  }
  
  // 随机波动 ±1.5%
  const noise = 1 + (Math.random() - 0.5) * 0.03
  
  return Math.round(basePrice * factor * timeAdjust * noise)
}

// 获取实时行情
export function getMarketQuote(modelCode, region = 'SG1') {
  const model = getModelByCode(modelCode)
  if (!model) return null
  
  const price = calculateCurrentPrice(model.base_price, region)
  const spread = price * 0.002 // 0.2% 价差
  
  return {
    model_code: modelCode,
    model_name: model.name,
    provider: model.provider,
    region,
    price,
    bid: Math.round(price - spread),
    ask: Math.round(price + spread),
    volume: Math.round(50000 + Math.random() * 200000),
    change_24h: (Math.random() - 0.5) * 8, // ±4%
    change_pct_24h: (Math.random() - 0.5) * 8,
    high_24h: Math.round(price * (1 + Math.random() * 0.05)),
    low_24h: Math.round(price * (1 - Math.random() * 0.05)),
    timestamp: new Date().toISOString()
  }
}

// 获取所有模型行情
export function getAllMarketQuotes(region = 'SG1') {
  const models = getModels()
  return models.map(m => getMarketQuote(m.code, region))
}

// 生成K线数据
export function generateCandles(modelCode, region = 'SG1', timeframe = '1h', count = 100) {
  const model = getModelByCode(modelCode)
  if (!model) return []
  
  const now = new Date()
  const msPerCandle = {
    '1m': 60000, '5m': 300000, '15m': 900000,
    '1h': 3600000, '4h': 14400000, '1d': 86400000
  }[timeframe] || 3600000
  
  const candles = []
  let prevClose = model.base_price * (REGION_PRICE_FACTOR[region] || 1.0)
  
  for (let i = count - 1; i >= 0; i--) {
    const ts = new Date(now.getTime() - i * msPerCandle)
    const hour = ts.getHours()
    
    const basePrice = calculateCurrentPrice(model.base_price, region, hour)
    const open = prevClose
    const close = basePrice
    const high = Math.max(open, close) * (1 + Math.random() * 0.015)
    const low = Math.min(open, close) * (1 - Math.random() * 0.015)
    const volume = Math.round(10000 + Math.random() * 50000)
    
    candles.push({
      model_code: modelCode,
      region,
      timeframe,
      open: Math.round(open),
      high: Math.round(high),
      low: Math.round(low),
      close: Math.round(close),
      volume,
      timestamp: ts.toISOString()
    })
    
    prevClose = close
  }
  
  // 存入数据库
  const upsert = db.prepare(`
    INSERT OR REPLACE INTO quant_candles (model_code, region, timeframe, open, high, low, close, volume, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  
  const insertMany = db.transaction((cands) => {
    for (const c of cands) {
      upsert.run(c.model_code, c.region, c.timeframe, c.open, c.high, c.low, c.close, c.volume, c.timestamp)
    }
  })
  insertMany(candles)
  
  return candles
}

// 获取K线数据（优先从数据库读取，不存在则生成）
export function getCandles(modelCode, region = 'SG1', timeframe = '1h', limit = 100) {
  const cached = db.prepare(`
    SELECT * FROM quant_candles 
    WHERE model_code = ? AND region = ? AND timeframe = ?
    ORDER BY timestamp DESC LIMIT ?
  `).all(modelCode, region, timeframe, limit)
  
  if (cached.length >= limit) {
    return cached.reverse()
  }
  
  // 生成新数据
  return generateCandles(modelCode, region, timeframe, limit)
}

// 计算技术指标
export function calculateIndicators(candles) {
  if (!candles || candles.length < 14) return {}
  
  const closes = candles.map(c => c.close)
  
  // RSI (14)
  const rsiPeriod = 14
  let gains = 0, losses = 0
  for (let i = closes.length - rsiPeriod; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff >= 0) gains += diff
    else losses -= diff
  }
  const avgGain = gains / rsiPeriod
  const avgLoss = losses / rsiPeriod
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  const rsi = 100 - (100 / (1 + rs))
  
  // MACD (12, 26, 9)
  const ema = (period, data) => {
    const k = 2 / (period + 1)
    let ema = data[0]
    for (let i = 1; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k)
    }
    return ema
  }
  const ema12 = ema(12, closes.slice(-26))
  const ema26 = ema(26, closes)
  const macd = ema12 - ema26
  const signal = macd * 0.9 // 简化信号线
  
  // 布林带 (20, 2)
  const bbPeriod = 20
  const bbData = closes.slice(-bbPeriod)
  const sma = bbData.reduce((a, b) => a + b, 0) / bbData.length
  const variance = bbData.reduce((a, b) => a + (b - sma) ** 2, 0) / bbPeriod
  const stdDev = Math.sqrt(variance)
  const upperBand = sma + 2 * stdDev
  const lowerBand = sma - 2 * stdDev
  
  // 移动平均线
  const ma5 = closes.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, closes.length)
  const ma10 = closes.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, closes.length)
  const ma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, closes.length)
  
  // 成交量
  const volumes = candles.map(c => c.volume)
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length
  
  return {
    rsi: Math.round(rsi * 100) / 100,
    macd: Math.round(macd * 100) / 100,
    macd_signal: Math.round(signal * 100) / 100,
    macd_histogram: Math.round((macd - signal) * 100) / 100,
    bollinger: {
      upper: Math.round(upperBand),
      middle: Math.round(sma),
      lower: Math.round(lowerBand)
    },
    ma: {
      ma5: Math.round(ma5),
      ma10: Math.round(ma10),
      ma20: Math.round(ma20)
    },
    avg_volume: Math.round(avgVolume),
    last_price: closes[closes.length - 1]
  }
}

// 获取远期合约列表
export function getForwardContracts() {
  const models = getModels()
  const contracts = []
  const now = new Date()
  
  // 生成2026年8月到2027年1月的远期合约
  const months = [
    { label: '2026年8月', date: '2026-08', delivery: '2026-08-31' },
    { label: '2026年9月', date: '2026-09', delivery: '2026-09-30' },
    { label: '2026年10月', date: '2026-10', delivery: '2026-10-31' },
    { label: '2026年11月', date: '2026-11', delivery: '2026-11-30' },
    { label: '2026年12月', date: '2026-12', delivery: '2026-12-31' },
    { label: '2027年1月', date: '2027-01', delivery: '2027-01-31' }
  ]
  
  for (const model of models) {
    for (const month of months) {
      // 远期价格 = 现货价格 + 持仓成本（月利率约0.5%）
      const monthsAhead = Math.max(1, (new Date(month.delivery).getMonth() - now.getMonth() + 12) % 12)
      const forwardPrice = Math.round(model.base_price * (1 + 0.005 * monthsAhead + Math.random() * 0.02))
      
      contracts.push({
        id: `${model.code}-${month.date}`,
        model_code: model.code,
        model_name: model.name,
        delivery_month: month.label,
        delivery_date: month.delivery,
        forward_price: forwardPrice,
        spot_price: model.base_price,
        basis: forwardPrice - model.base_price,
        basis_pct: ((forwardPrice - model.base_price) / model.base_price * 100).toFixed(2),
        contract_type: 'firm',
        volume: Math.round(10000 + Math.random() * 50000)
      })
    }
  }
  
  return contracts
}

// 获取区域列表
export function getRegions() {
  return [
    { code: 'SG1', name: '新加坡1', factor: 1.0, peak_start: '09:00', valley_start: '00:00' },
    { code: 'EU1', name: '欧洲1', factor: 1.08, peak_start: '09:00', valley_start: '00:00' },
    { code: 'US1', name: '美国1', factor: 1.12, peak_start: '09:00', valley_start: '00:00' },
    { code: 'CN1', name: '中国1', factor: 0.95, peak_start: '09:00', valley_start: '00:00' },
    { code: 'HK1', name: '香港1', factor: 1.03, peak_start: '09:00', valley_start: '00:00' },
    { code: 'JP1', name: '日本1', factor: 1.06, peak_start: '09:00', valley_start: '00:00' }
  ]
}

// 获取市场概况（集成爬虫数据）
export async function getMarketOverview() {
  const models = getModels()
  const quotes = getAllMarketQuotes('SG1')

  // 尝试获取爬虫数据
  let kaiData = null
  try {
    const { scrapeKaiMarket } = await import('./kaiScraper.js')
    kaiData = await scrapeKaiMarket()
  } catch {
    // 爬虫不可用时使用模拟数据
  }
  
  const totalVolume = quotes.reduce((sum, q) => sum + q.volume, 0)
  const avgPrice = quotes.reduce((sum, q) => sum + q.price, 0) / quotes.length
  const gainers = quotes.filter(q => q.change_pct_24h > 0).length
  const losers = quotes.filter(q => q.change_pct_24h < 0).length
  
  return {
    models: models.map(m => ({
      code: m.code,
      name: m.name,
      provider: m.provider,
      base_price: m.base_price,
      description: m.description
    })),
    quotes,
    summary: {
      total_models: models.length,
      total_volume_24h: totalVolume,
      total_value_24h: Math.round(totalVolume * avgPrice),
      gainers,
      losers,
      avg_price: Math.round(avgPrice),
      timestamp: new Date().toISOString()
    },
    regions: getRegions(),
    kaiLive: kaiData ? {
      source: kaiData.source,
      latestPrice: kaiData.latestPrice,
      spread: kaiData.spread,
      orderBook: kaiData.orderBook,
      account: kaiData.account,
      models: kaiData.models,
      timestamp: kaiData.timestamp
    } : null
  }
}

// 保存行情快照
export function saveMarketSnapshot() {
  const models = getModels()
  const regions = getRegions()
  const insert = db.prepare(`
    INSERT INTO quant_market_data (model_code, region, price, volume, bid, ask, market_type, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, 'spot', ?)
  `)
  
  const ts = new Date().toISOString()
  const insertMany = db.transaction(() => {
    for (const model of models) {
      for (const region of regions) {
        const quote = getMarketQuote(model.code, region.code)
        insert.run(model.code, region.code, quote.price, quote.volume, quote.bid, quote.ask, ts)
      }
    }
  })
  insertMany()
  
  return { saved: models.length * regions.length, timestamp: ts }
}
