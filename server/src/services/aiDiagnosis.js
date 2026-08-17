/**
 * 实时 AI 诊断服务
 *
 * 基于 KAI 市场数据，使用 AI 模型进行实时诊断：
 * - 订单簿深度分析
 * - 价格趋势判断
 * - 买卖压力评估
 * - 风险预警
 * - 策略调整建议
 * - 市场情绪分析
 *
 * AI 模型优先使用 CloudBase AI（当可用时），
 * 否则回退到规则引擎分析。
 */

import { scrapeKaiMarket, analyzeOrderBookDepth } from './kaiScraper.js'
import { calculateIndicators, getCandles } from './marketData.js'

// 诊断历史记录（内存缓存）
const diagnosisHistory = []
const MAX_HISTORY = 50

/**
 * 执行实时 AI 诊断
 */
export async function performDiagnosis(options = {}) {
  const { model = 'GLM-5.2', capital = 1000000, riskPreference = 'moderate' } = options

  // 1. 获取实时市场数据
  const marketData = await scrapeKaiMarket()
  const depth = analyzeOrderBookDepth(marketData.orderBook)

  // 2. 获取技术指标
  const candles = getCandles(model, 'HK1', '1h', 50)
  const indicators = calculateIndicators(candles)

  // 3. 构建市场上下文
  const context = buildMarketContext(marketData, depth, indicators, model)

  // 4. AI 诊断分析
  const analysis = await runAIDiagnosis(context, capital, riskPreference)

  // 5. 生成交易信号
  const signals = generateTradingSignals(marketData, depth, indicators, analysis)

  // 6. 生成风险预警
  const alerts = generateRiskAlerts(marketData, depth, indicators, signals)

  // 7. 生成策略调整建议
  const adjustments = generateStrategyAdjustments(signals, indicators, riskPreference)

  const result = {
    timestamp: new Date().toISOString(),
    model,
    marketData: {
      source: marketData.source,
      latestPrice: marketData.latestPrice,
      spread: marketData.spread,
      account: marketData.account,
      orderBookDepth: depth
    },
    indicators,
    diagnosis: analysis,
    signals,
    alerts,
    strategyAdjustments: adjustments,
    context
  }

  // 保存到历史
  diagnosisHistory.unshift(result)
  if (diagnosisHistory.length > MAX_HISTORY) {
    diagnosisHistory.pop()
  }

  return result
}

/**
 * 构建市场上下文
 */
function buildMarketContext(marketData, depth, indicators, model) {
  const askPrices = marketData.orderBook?.asks?.map(a => a.price) || []
  const bidPrices = marketData.orderBook?.bids?.map(b => b.price) || []

  return {
    model,
    timestamp: marketData.timestamp,
    dataSource: marketData.source,
    price: {
      latest: marketData.latestPrice,
      spread: marketData.spread,
      bestAsk: askPrices[0] || null,
      bestBid: bidPrices[0] || null,
      askLevels: askPrices.length,
      bidLevels: bidPrices.length
    },
    orderBook: {
      askVolume: depth.askVolume,
      bidVolume: depth.bidVolume,
      imbalance: depth.imbalance,
      pressure: depth.pressure
    },
    account: marketData.account,
    indicators: indicators.last_price ? {
      rsi: indicators.rsi,
      macd: indicators.macd,
      macdSignal: indicators.macd_signal,
      bollinger: indicators.bollinger,
      ma: indicators.ma,
      avgVolume: indicators.avg_volume
    } : null
  }
}

/**
 * AI 诊断分析 — 规则引擎（可扩展为 CloudBase AI）
 */
async function runAIDiagnosis(context, capital, riskPreference) {
  const { price, orderBook, indicators } = context
  const diagnoses = []

  // 1. 订单簿压力分析
  if (orderBook.pressure === 'buy') {
    diagnoses.push({
      category: 'order_book', level: 'info', confidence: 0.7,
      title: '买盘压力较强',
      detail: `买盘 ${orderBook.bidVolume} 手 vs 卖盤 ${orderBook.askVolume} 手，不平衡度 ${(orderBook.imbalance * 100).toFixed(1)}%，短期偏多。`
    })
  } else if (orderBook.pressure === 'sell') {
    diagnoses.push({
      category: 'order_book', level: 'warning', confidence: 0.7,
      title: '卖盘压力较强',
      detail: `买盘 ${orderBook.bidVolume} 手 vs 卖盤 ${orderBook.askVolume} 手，不平衡度 ${(orderBook.imbalance * 100).toFixed(1)}%，短期偏空。`
    })
  } else {
    diagnoses.push({
      category: 'order_book', level: 'info', confidence: 0.5,
      title: '买卖力量均衡',
      detail: `不平衡度 ${(orderBook.imbalance * 100).toFixed(1)}%，无明确方向。`
    })
  }

  // 2. 价差分析
  if (price.spread > 2) {
    diagnoses.push({
      category: 'spread', level: 'warning', confidence: 0.8,
      title: '价差偏大',
      detail: `价差 ${price.spread}，流动性不足，大额交易注意滑点。`
    })
  } else {
    diagnoses.push({
      category: 'spread', level: 'info', confidence: 0.8,
      title: '价差正常',
      detail: `价差 ${price.spread}，流动性充足。`
    })
  }

  // 3. 技术指标分析
  if (indicators) {
    if (indicators.rsi > 70) {
      diagnoses.push({ category: 'technical', level: 'warning', confidence: 0.75,
        title: 'RSI 超买', detail: `RSI ${indicators.rsi} > 70，短期可能回调。` })
    } else if (indicators.rsi < 30) {
      diagnoses.push({ category: 'technical', level: 'info', confidence: 0.75,
        title: 'RSI 超卖', detail: `RSI ${indicators.rsi} < 30，可能反弹。` })
    } else {
      diagnoses.push({ category: 'technical', level: 'info', confidence: 0.6,
        title: 'RSI 中性', detail: `RSI ${indicators.rsi}，正常区间。` })
    }

    if (indicators.macd > indicators.macdSignal) {
      diagnoses.push({ category: 'technical', level: 'info', confidence: 0.7,
        title: 'MACD 金叉', detail: `MACD ${indicators.macd} > 信号 ${indicators.macdSignal}，多头动能。` })
    } else {
      diagnoses.push({ category: 'technical', level: 'warning', confidence: 0.7,
        title: 'MACD 死叉', detail: `MACD ${indicators.macd} < 信号 ${indicators.macdSignal}，空头动能。` })
    }

    if (indicators.bollinger) {
      const { upper, lower } = indicators.bollinger
      if (price.latest > upper) {
        diagnoses.push({ category: 'technical', level: 'warning', confidence: 0.7,
          title: '突破布林上轨', detail: `价格 ${price.latest} > 上轨 ${upper}，可能超涨。` })
      } else if (price.latest < lower) {
        diagnoses.push({ category: 'technical', level: 'info', confidence: 0.7,
          title: '触及布林下轨', detail: `价格 ${price.latest} < 下轨 ${lower}，可能超跌反弹。` })
      }
    }
  }

  // 4. 综合诊断
  const buySignals = diagnoses.filter(d => d.level === 'info' && d.confidence > 0.6).length
  const sellSignals = diagnoses.filter(d => d.level === 'warning' && d.confidence > 0.6).length
  const sentiment = buySignals > sellSignals ? 'bullish' : sellSignals > buySignals ? 'bearish' : 'neutral'

  return {
    items: diagnoses,
    summary: {
      totalItems: diagnoses.length,
      buySignals, sellSignals,
      overallSentiment: sentiment,
      confidence: Math.max(...diagnoses.map(d => d.confidence), 0.5),
      recommendation: sentiment === 'bullish' ? '偏多' : sentiment === 'bearish' ? '偏空' : '观望'
    }
  }
}

/**
 * 生成交易信号
 */
function generateTradingSignals(marketData, depth, indicators, analysis) {
  const signals = []

  if (depth.pressure === 'buy' && depth.imbalance > 0.3) {
    signals.push({ type: 'order_book', action: 'buy', strength: 'medium',
      reason: `买盘压力显著（${(depth.imbalance * 100).toFixed(0)}%），短期偏多`,
      suggestedPrice: marketData.latestPrice, suggestedSize: 'small' })
  } else if (depth.pressure === 'sell' && depth.imbalance < -0.3) {
    signals.push({ type: 'order_book', action: 'sell', strength: 'medium',
      reason: `卖盘压力显著（${(depth.imbalance * 100).toFixed(0)}%），短期偏空`,
      suggestedPrice: marketData.latestPrice, suggestedSize: 'small' })
  }

  if (indicators.rsi < 30) {
    signals.push({ type: 'technical', action: 'buy', strength: 'medium',
      reason: `RSI ${indicators.rsi} 超卖，反弹概率高`,
      suggestedPrice: marketData.latestPrice, suggestedSize: 'medium' })
  } else if (indicators.rsi > 70) {
    signals.push({ type: 'technical', action: 'sell', strength: 'medium',
      reason: `RSI ${indicators.rsi} 超买，回调概率高`,
      suggestedPrice: marketData.latestPrice, suggestedSize: 'medium' })
  }

  if (indicators.macd > indicators.macd_signal && indicators.macd > 0) {
    signals.push({ type: 'technical', action: 'buy', strength: 'weak',
      reason: 'MACD 金叉且为正值，多头趋势',
      suggestedPrice: marketData.latestPrice, suggestedSize: 'small' })
  } else if (indicators.macd < indicators.macd_signal && indicators.macd < 0) {
    signals.push({ type: 'technical', action: 'sell', strength: 'weak',
      reason: 'MACD 死叉且为负值，空头趋势',
      suggestedPrice: marketData.latestPrice, suggestedSize: 'small' })
  }

  const buyCount = signals.filter(s => s.action === 'buy').length
  const sellCount = signals.filter(s => s.action === 'sell').length
  const overall = buyCount > sellCount ? 'buy' : sellCount > buyCount ? 'sell' : 'hold'

  return { items: signals, overall, buyCount, sellCount, holdCount: signals.length - buyCount - sellCount }
}

/**
 * 生成风险预警
 */
function generateRiskAlerts(marketData, depth, indicators, signals) {
  const alerts = []

  if (marketData.spread > 2) {
    alerts.push({ level: 'warning', title: '流动性风险',
      message: `价差 ${marketData.spread}，大额交易注意滑点`, action: '减少单笔量，分批建仓' })
  }

  if (Math.abs(depth.imbalance) > 0.4) {
    alerts.push({ level: 'warning', title: '订单簿不平衡',
      message: `不平衡度 ${(depth.imbalance * 100).toFixed(0)}%，${depth.pressure === 'buy' ? '买盘' : '卖盘'}占优`,
      action: `考虑${depth.pressure === 'buy' ? '跟随买入' : '跟随卖出'}或观望` })
  }

  if (indicators.rsi > 80) {
    alerts.push({ level: 'critical', title: 'RSI 严重超买',
      message: `RSI ${indicators.rsi}，回调风险大`, action: '减仓或设置止损' })
  } else if (indicators.rsi < 20) {
    alerts.push({ level: 'critical', title: 'RSI 严重超卖',
      message: `RSI ${indicators.rsi}，可能反弹`, action: '关注反弹机会，控制仓位' })
  }

  if (signals.buyCount >= 3) {
    alerts.push({ level: 'info', title: '多头信号集中',
      message: `${signals.buyCount} 个买入信号`, action: '可适度建仓' })
  } else if (signals.sellCount >= 3) {
    alerts.push({ level: 'info', title: '空头信号集中',
      message: `${signals.sellCount} 个卖出信号`, action: '可减仓或观望' })
  }

  return alerts
}

/**
 * 生成策略调整建议
 */
function generateStrategyAdjustments(signals, indicators, riskPreference) {
  const adjustments = []

  if (signals.overall === 'buy') {
    adjustments.push({ strategy: 'trend_following', action: 'increase_position',
      reason: '多头信号占优，趋势跟踪可加仓', params: { stop_loss: 0.05, take_profit: 0.10 } })
  } else if (signals.overall === 'sell') {
    adjustments.push({ strategy: 'trend_following', action: 'reduce_position',
      reason: '空头信号占优，趋势跟踪应减仓', params: { stop_loss: 0.03, take_profit: 0.05 } })
  }

  if (indicators.rsi < 30) {
    adjustments.push({ strategy: 'mean_reversion', action: 'open_position',
      reason: 'RSI 超卖，均值回归策略适合建仓', params: { target_rsi: 50 } })
  } else if (indicators.rsi > 70) {
    adjustments.push({ strategy: 'mean_reversion', action: 'close_position',
      reason: 'RSI 超买，均值回归策略适合平仓', params: { target_rsi: 50 } })
  }

  if (Math.abs(signals.buyCount - signals.sellCount) <= 1) {
    adjustments.push({ strategy: 'market_making', action: 'increase_spread',
      reason: '市场方向不明确，做市策略可扩大价差', params: { spread_multiplier: 1.2 } })
  }

  return adjustments
}

/**
 * 获取诊断历史
 */
export function getDiagnosisHistory(limit = 20) {
  return diagnosisHistory.slice(0, limit)
}

/**
 * 获取市场情绪趋势
 */
export function getSentimentTrend() {
  if (diagnosisHistory.length < 2) return { trend: 'insufficient_data' }

  const recent = diagnosisHistory.slice(0, 10)
  const sentiments = recent.map(d => d.diagnosis?.summary?.overallSentiment || 'neutral')

  const bullish = sentiments.filter(s => s === 'bullish').length
  const bearish = sentiments.filter(s => s === 'bearish').length

  if (bullish > bearish * 2) return { trend: 'strong_bullish', bullish, bearish, total: sentiments.length }
  if (bearish > bullish * 2) return { trend: 'strong_bearish', bullish, bearish, total: sentiments.length }
  if (bullish > bearish) return { trend: 'bullish', bullish, bearish, total: sentiments.length }
  if (bearish > bullish) return { trend: 'bearish', bullish, bearish, total: sentiments.length }
  return { trend: 'neutral', bullish, bearish, total: sentiments.length }
}

export default { performDiagnosis, getDiagnosisHistory, getSentimentTrend }
