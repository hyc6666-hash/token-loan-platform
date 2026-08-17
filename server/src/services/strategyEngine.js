/**
 * 多策略引擎
 * 
 * 5大策略类型：
 * 1. cross_model_arb - 跨模型套利
 * 2. time_region_arb - 分时/跨区域套利
 * 3. trend_following - 趋势跟踪
 * 4. mean_reversion - 均值回归
 * 5. market_making - 做市策略
 * 6. forward_spot_arb - 远期-现货套利
 */

import db from '../database/quant-init.js'
import { v4 as uuidv4 } from 'uuid'
import { getMarketQuote, getCandles, calculateIndicators, getModels, getRegions, getForwardContracts } from './marketData.js'

// ============ 策略定义 ============
export const STRATEGY_TYPES = {
  cross_model_arb: {
    name: '跨模型套利',
    description: '利用 GLM-5.2、DeepSeek-V4、Qwen3-Max、Kimi-K3 之间的价差进行对冲套利',
    risk_level: 'low',
    expected_return: '8-15%',
    min_capital: 50000,
    max_capital: Infinity,
    suitable_for: ['conservative', 'moderate'],
    params: {
      spread_threshold: { default: 0.05, min: 0.02, max: 0.15, label: '价差阈值(%)' },
      holding_period: { default: 24, min: 1, max: 168, label: '持仓周期(小时)' },
      max_positions: { default: 4, min: 2, max: 8, label: '最大持仓对数' }
    }
  },
  time_region_arb: {
    name: '分时/跨区域套利',
    description: '利用6大区域峰谷价差、时区差异进行低买高卖',
    risk_level: 'low',
    expected_return: '10-20%',
    min_capital: 30000,
    max_capital: Infinity,
    suitable_for: ['conservative', 'moderate', 'aggressive'],
    params: {
      peak_valley_ratio: { default: 0.15, min: 0.05, max: 0.30, label: '峰谷价比阈值' },
      regions: { default: ['SG1', 'CN1', 'HK1'], label: '参与区域' },
      auto_switch: { default: true, label: '自动切换区域' }
    }
  },
  trend_following: {
    name: '趋势跟踪',
    description: '基于 RSI、MACD 等技术指标对容量价格做趋势跟踪',
    risk_level: 'medium',
    expected_return: '15-30%',
    min_capital: 20000,
    max_capital: Infinity,
    suitable_for: ['moderate', 'aggressive'],
    params: {
      rsi_period: { default: 14, min: 7, max: 28, label: 'RSI周期' },
      rsi_overbought: { default: 70, min: 60, max: 85, label: 'RSI超买线' },
      rsi_oversold: { default: 30, min: 15, max: 40, label: 'RSI超卖线' },
      stop_loss: { default: 0.05, min: 0.02, max: 0.15, label: '止损比例' },
      take_profit: { default: 0.10, min: 0.05, max: 0.30, label: '止盈比例' }
    }
  },
  mean_reversion: {
    name: '均值回归',
    description: '基于布林带和移动平均线，价格偏离均值时反向操作',
    risk_level: 'medium',
    expected_return: '12-25%',
    min_capital: 20000,
    max_capital: Infinity,
    suitable_for: ['moderate', 'aggressive'],
    params: {
      bb_period: { default: 20, min: 10, max: 50, label: '布林带周期' },
      bb_std: { default: 2, min: 1.5, max: 3, label: '标准差倍数' },
      ma_period: { default: 20, min: 5, max: 60, label: '均线周期' },
      stop_loss: { default: 0.04, min: 0.02, max: 0.10, label: '止损比例' }
    }
  },
  market_making: {
    name: '做市策略',
    description: '在 C2C 市场提供流动性，赚取买卖价差',
    risk_level: 'medium',
    expected_return: '5-12%',
    min_capital: 100000,
    max_capital: Infinity,
    suitable_for: ['moderate', 'aggressive', 'extreme'],
    params: {
      spread_bps: { default: 20, min: 5, max: 100, label: '报价价差(bps)' },
      order_size: { default: 10, min: 1, max: 100, label: '单笔报量(blocks)' },
      max_inventory: { default: 50, min: 10, max: 500, label: '最大库存(blocks)' },
      inventory_threshold: { default: 0.8, min: 0.5, max: 0.95, label: '库存阈值' }
    }
  },
  forward_spot_arb: {
    name: '远期-现货套利',
    description: '利用远期合约与现货价格的基差进行套利',
    risk_level: 'low',
    expected_return: '6-15%',
    min_capital: 50000,
    max_capital: Infinity,
    suitable_for: ['conservative', 'moderate'],
    params: {
      min_basis: { default: 0.02, min: 0.005, max: 0.08, label: '最小基差(%)' },
      delivery_months: { default: 3, min: 1, max: 6, label: '远期月数' },
      hedge_ratio: { default: 1.0, min: 0.5, max: 1.5, label: '对冲比率' }
    }
  }
}

// ============ 创建策略 ============
export function createStrategy(userId, strategyData) {
  const id = uuidv4()
  
  db.prepare(`
    INSERT INTO quant_strategies (id, user_id, name, type, config, allocated_capital, expected_return, max_risk, status, auto_execute, ai_recommended)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, userId, strategyData.name, strategyData.type,
    JSON.stringify(strategyData.config || {}),
    strategyData.allocated_capital || 0,
    strategyData.expected_return || 0,
    strategyData.max_risk || 0,
    strategyData.status || 'draft',
    strategyData.auto_execute ? 1 : 0,
    strategyData.ai_recommended ? 1 : 0
  )
  
  return db.prepare('SELECT * FROM quant_strategies WHERE id = ?').get(id)
}

// ============ 获取用户策略 ============
export function getUserStrategies(userId) {
  const strategies = db.prepare('SELECT * FROM quant_strategies WHERE user_id = ? ORDER BY created_at DESC').all(userId)
  return strategies.map(s => ({
    ...s,
    config: typeof s.config === 'string' ? JSON.parse(s.config) : s.config,
    performance_data: s.performance_data ? (typeof s.performance_data === 'string' ? JSON.parse(s.performance_data) : s.performance_data) : null
  }))
}

// ============ 更新策略 ============
export function updateStrategy(strategyId, userId, updates) {
  const fields = []
  const values = []
  
  for (const [key, val] of Object.entries(updates)) {
    if (key === 'config') {
      fields.push('config = ?')
      values.push(JSON.stringify(val))
    } else if (['name', 'allocated_capital', 'expected_return', 'max_risk', 'status', 'auto_execute'].includes(key)) {
      fields.push(`${key} = ?`)
      values.push(val)
    }
  }
  
  if (fields.length === 0) return null
  
  fields.push("updated_at = datetime('now', 'localtime')")
  values.push(strategyId, userId)
  
  db.prepare(`UPDATE quant_strategies SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values)
  return db.prepare('SELECT * FROM quant_strategies WHERE id = ?').get(strategyId)
}

// ============ 删除策略 ============
export function deleteStrategy(strategyId, userId) {
  db.prepare('DELETE FROM quant_strategies WHERE id = ? AND user_id = ?').run(strategyId, userId)
  return { success: true }
}

// ============ 策略信号生成 ============
export function generateSignals(userId, strategyId) {
  const strategy = db.prepare('SELECT * FROM quant_strategies WHERE id = ? AND user_id = ?').get(strategyId, userId)
  if (!strategy) return []
  
  const config = typeof strategy.config === 'string' ? JSON.parse(strategy.config) : strategy.config
  const signals = []
  
  switch (strategy.type) {
    case 'cross_model_arb':
      signals.push(...generateCrossModelSignals(userId, strategyId, config))
      break
    case 'time_region_arb':
      signals.push(...generateTimeRegionSignals(userId, strategyId, config))
      break
    case 'trend_following':
      signals.push(...generateTrendSignals(userId, strategyId, config))
      break
    case 'mean_reversion':
      signals.push(...generateMeanReversionSignals(userId, strategyId, config))
      break
    case 'market_making':
      signals.push(...generateMarketMakingSignals(userId, strategyId, config))
      break
    case 'forward_spot_arb':
      signals.push(...generateForwardSpotSignals(userId, strategyId, config))
      break
  }
  
  // 保存信号
  for (const sig of signals) {
    db.prepare(`
      INSERT INTO quant_signals (id, strategy_id, user_id, model_code, region, signal_type, strength, price, indicator_data, reasoning, executed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(uuidv4(), strategyId, userId, sig.model_code, sig.region, sig.signal_type, sig.strength, sig.price, JSON.stringify(sig.indicators || {}), sig.reasoning || '')
  }
  
  return signals
}

// ============ 跨模型套利信号 ============
function generateCrossModelSignals(userId, strategyId, config) {
  const models = getModels()
  const signals = []
  const threshold = (config.spread_threshold || 0.05)
  
  // 计算所有模型对的价格比
  for (let i = 0; i < models.length; i++) {
    for (let j = i + 1; j < models.length; j++) {
      const m1 = getMarketQuote(models[i].code, 'SG1')
      const m2 = getMarketQuote(models[j].code, 'SG1')
      
      const priceRatio = m1.price / m2.price
      const expectedRatio = models[i].base_price / models[j].base_price
      const deviation = Math.abs(priceRatio - expectedRatio) / expectedRatio
      
      if (deviation > threshold) {
        const underpriced = priceRatio < expectedRatio ? m1 : m2
        const overpriced = priceRatio < expectedRatio ? m2 : m1
        
        signals.push({
          model_code: underpriced.model_code,
          region: 'SG1',
          signal_type: 'buy',
          strength: Math.min(1, deviation / (threshold * 3)),
          price: underpriced.price,
          indicators: { price_ratio: priceRatio, expected_ratio: expectedRatio, deviation },
          reasoning: `${underpriced.model_code} 相对 ${overpriced.model_code} 低估 ${(deviation * 100).toFixed(1)}%，建议买入 ${underpriced.model_code} 并卖出 ${overpriced.model_code}`
        })
        
        signals.push({
          model_code: overpriced.model_code,
          region: 'SG1',
          signal_type: 'sell',
          strength: Math.min(1, deviation / (threshold * 3)),
          price: overpriced.price,
          indicators: { price_ratio: priceRatio, expected_ratio: expectedRatio, deviation },
          reasoning: `${overpriced.model_code} 相对 ${underpriced.model_code} 高估 ${(deviation * 100).toFixed(1)}%，建议卖出`
        })
      }
    }
  }
  
  return signals
}

// ============ 分时/跨区域套利信号 ============
function generateTimeRegionSignals(userId, strategyId, config) {
  const models = getModels()
  const regions = getRegions()
  const signals = []
  const threshold = config.peak_valley_ratio || 0.15
  
  for (const model of models) {
    const quotes = regions.map(r => ({
      ...getMarketQuote(model.code, r.code),
      region: r.code,
      factor: r.factor
    }))
    
    const minQuote = quotes.reduce((min, q) => q.price < min.price ? q : min, quotes[0])
    const maxQuote = quotes.reduce((max, q) => q.price > max.price ? q : max, quotes[0])
    
    const spread = (maxQuote.price - minQuote.price) / minQuote.price
    
    if (spread > threshold) {
      signals.push({
        model_code: model.code,
        region: minQuote.region,
        signal_type: 'buy',
        strength: Math.min(1, spread / (threshold * 3)),
        price: minQuote.price,
        indicators: { spread, min_region: minQuote.region, max_region: maxQuote.region, min_price: minQuote.price, max_price: maxQuote.price },
        reasoning: `${model.code} 在 ${minQuote.region} 价格最低 ¥${minQuote.price}，${maxQuote.region} 最高 ¥${maxQuote.price}，价差 ${(spread * 100).toFixed(1)}%`
      })
      
      signals.push({
        model_code: model.code,
        region: maxQuote.region,
        signal_type: 'sell',
        strength: Math.min(1, spread / (threshold * 3)),
        price: maxQuote.price,
        indicators: { spread, min_region: minQuote.region, max_region: maxQuote.region },
        reasoning: `${model.code} 在 ${maxQuote.region} 价格最高，建议卖出`
      })
    }
  }
  
  return signals
}

// ============ 趋势跟踪信号 ============
function generateTrendSignals(userId, strategyId, config) {
  const models = getModels()
  const signals = []
  const rsiOverbought = config.rsi_overbought || 70
  const rsiOversold = config.rsi_oversold || 30
  
  for (const model of models) {
    const candles = getCandles(model.code, 'SG1', '1h', 50)
    const indicators = calculateIndicators(candles)
    
    if (!indicators.rsi) continue
    
    if (indicators.rsi < rsiOversold) {
      signals.push({
        model_code: model.code,
        region: 'SG1',
        signal_type: 'buy',
        strength: Math.min(1, (rsiOversold - indicators.rsi) / rsiOversold),
        price: indicators.last_price,
        indicators,
        reasoning: `RSI=${indicators.rsi} 低于超卖线 ${rsiOversold}，趋势可能反转向上`
      })
    } else if (indicators.rsi > rsiOverbought) {
      signals.push({
        model_code: model.code,
        region: 'SG1',
        signal_type: 'sell',
        strength: Math.min(1, (indicators.rsi - rsiOverbought) / (100 - rsiOverbought)),
        price: indicators.last_price,
        indicators,
        reasoning: `RSI=${indicators.rsi} 高于超买线 ${rsiOverbought}，趋势可能反转向下`
      })
    }
    
    // MACD 信号
    if (indicators.macd_histogram > 0 && indicators.macd > indicators.macd_signal) {
      signals.push({
        model_code: model.code,
        region: 'SG1',
        signal_type: 'buy',
        strength: 0.6,
        price: indicators.last_price,
        indicators,
        reasoning: `MACD金叉，柱状图=${indicators.macd_histogram}，多头趋势`
      })
    } else if (indicators.macd_histogram < 0 && indicators.macd < indicators.macd_signal) {
      signals.push({
        model_code: model.code,
        region: 'SG1',
        signal_type: 'sell',
        strength: 0.6,
        price: indicators.last_price,
        indicators,
        reasoning: `MACD死叉，柱状图=${indicators.macd_histogram}，空头趋势`
      })
    }
  }
  
  return signals
}

// ============ 均值回归信号 ============
function generateMeanReversionSignals(userId, strategyId, config) {
  const models = getModels()
  const signals = []
  
  for (const model of models) {
    const candles = getCandles(model.code, 'SG1', '1h', 50)
    const indicators = calculateIndicators(candles)
    
    if (!indicators.bollinger) continue
    
    const { upper, middle, lower } = indicators.bollinger
    const price = indicators.last_price
    
    if (price <= lower) {
      signals.push({
        model_code: model.code,
        region: 'SG1',
        signal_type: 'buy',
        strength: Math.min(1, (middle - price) / (middle - lower)),
        price,
        indicators,
        reasoning: `价格 ¥${price} 触及布林带下轨 ¥${lower}，超卖回归预期`
      })
    } else if (price >= upper) {
      signals.push({
        model_code: model.code,
        region: 'SG1',
        signal_type: 'sell',
        strength: Math.min(1, (price - middle) / (upper - middle)),
        price,
        indicators,
        reasoning: `价格 ¥${price} 触及布林带上轨 ¥${upper}，超买回归预期`
      })
    }
  }
  
  return signals
}

// ============ 做市信号 ============
function generateMarketMakingSignals(userId, strategyId, config) {
  const models = getModels()
  const signals = []
  const spreadBps = config.spread_bps || 20
  const orderSize = config.order_size || 10
  
  for (const model of models) {
    const quote = getMarketQuote(model.code, 'SG1')
    const midPrice = quote.price
    const halfSpread = midPrice * spreadBps / 10000
    
    signals.push({
      model_code: model.code,
      region: 'SG1',
      signal_type: 'buy',
      strength: 0.5,
      price: Math.round(midPrice - halfSpread),
      indicators: { mid_price: midPrice, spread: spreadBps, order_size: orderSize },
      reasoning: `做市买单：¥${Math.round(midPrice - halfSpread)} (价差 ${spreadBps}bps)`
    })
    
    signals.push({
      model_code: model.code,
      region: 'SG1',
      signal_type: 'sell',
      strength: 0.5,
      price: Math.round(midPrice + halfSpread),
      indicators: { mid_price: midPrice, spread: spreadBps, order_size: orderSize },
      reasoning: `做市卖单：¥${Math.round(midPrice + halfSpread)} (价差 ${spreadBps}bps)`
    })
  }
  
  return signals
}

// ============ 远期-现货套利信号 ============
function generateForwardSpotSignals(userId, strategyId, config) {
  const contracts = getForwardContracts()
  const signals = []
  const minBasis = config.min_basis || 0.02
  
  for (const contract of contracts) {
    const basisPct = parseFloat(contract.basis_pct)
    
    if (basisPct > minBasis * 100) {
      // 远期升水：买入现货，卖出远期
      signals.push({
        model_code: contract.model_code,
        region: 'SG1',
        signal_type: 'buy',
        strength: Math.min(1, basisPct / (minBasis * 100 * 3)),
        price: contract.spot_price,
        indicators: { forward_price: contract.forward_price, spot_price: contract.spot_price, basis: contract.basis, basis_pct: basisPct },
        reasoning: `${contract.model_code} ${contract.delivery_month} 远期升水 ${basisPct}%，买入现货 ¥${contract.spot_price}，卖出远期 ¥${contract.forward_price}`
      })
    } else if (basisPct < -minBasis * 100) {
      // 远期贴水：买入远期，卖出现货
      signals.push({
        model_code: contract.model_code,
        region: 'SG1',
        signal_type: 'buy',
        strength: Math.min(1, Math.abs(basisPct) / (minBasis * 100 * 3)),
        price: contract.forward_price,
        indicators: { forward_price: contract.forward_price, spot_price: contract.spot_price, basis: contract.basis, basis_pct: basisPct },
        reasoning: `${contract.model_code} ${contract.delivery_month} 远期贴水 ${basisPct}%，买入远期 ¥${contract.forward_price}`
      })
    }
  }
  
  return signals
}

// ============ 获取策略信号 ============
export function getStrategySignals(strategyId, limit = 20) {
  const signals = db.prepare(`
    SELECT * FROM quant_signals WHERE strategy_id = ? ORDER BY created_at DESC LIMIT ?
  `).all(strategyId, limit)
  
  return signals.map(s => ({
    ...s,
    indicator_data: s.indicator_data ? JSON.parse(s.indicator_data) : {}
  }))
}

// ============ 获取策略类型定义 ============
export function getStrategyTypes() {
  return Object.entries(STRATEGY_TYPES).map(([key, val]) => ({
    type: key,
    ...val,
    params: Object.entries(val.params).map(([pk, pv]) => ({
      key: pk,
      ...pv
    }))
  }))
}
