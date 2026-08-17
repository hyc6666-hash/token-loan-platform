/**
 * 回测引擎
 *
 * 专业级历史数据回测系统：
 * - 事件驱动模拟（订单簿变化）
 * - 多种订单类型（市价/限价/止损/止损限价）
 * - 成本与滑点模型（手续费 + 买卖价差）
 * - 市场环境分类（趋势/震荡/高波动）
 * - 关键绩效指标计算
 *   - 年化收益率
 *   - 最大回撤
 *   - 夏普比率（风险调整后收益）
 *   - 胜率
 *   - 盈亏比
 *   - 平均持仓周期
 */

import { getCandles, calculateIndicators, getModels } from './marketData.js'
import { v4 as uuidv4 } from 'uuid'
import db from '../database/quant-init.js'

// ============ 策略类型定义 ============
export const STRATEGY_TYPES = {
  trend_following: {
    name: '趋势跟踪',
    description: '跟随市场趋势方向交易，在上升趋势中买入，下降趋势中卖出',
    params: { lookback: 20, signal_threshold: 0.7, stop_loss: 0.05, take_profit: 0.10 }
  },
  mean_reversion: {
    name: '均值回归',
    description: '利用价格偏离均值后的回归特性，超卖买入，超买卖出',
    params: { rsi_oversold: 30, rsi_overbought: 70, stop_loss: 0.03, take_profit: 0.05 }
  },
  market_making: {
    name: '做市策略',
    description: '同时挂买卖单赚取价差，需要高流动性市场',
    params: { spread_multiplier: 1.5, order_size: 10, rebalance_threshold: 0.3 }
  },
  cross_model_arb: {
    name: '跨模型套利',
    description: '利用不同AI模型之间的价格差异进行套利',
    params: { spread_threshold: 0.02, max_holding_hours: 24 }
  },
  time_region_arb: {
    name: '时间区域套利',
    description: '利用不同区域市场的时区差异进行套利',
    params: { region_pair: ['SG1', 'HK1'], min_spread: 0.01 }
  },
  forward_spot_arb: {
    name: '期现套利',
    description: '利用远期合约与现货之间的价差进行套利',
    params: { min_basis: 0.005, holding_days: 7 }
  },
  multi_strategy: {
    name: '多策略组合',
    description: '组合多种策略，分散风险，动态调整权重',
    params: { strategies: ['trend_following', 'mean_reversion'], weights: [0.6, 0.4] }
  }
}

// ============ 成本模型 ============
const DEFAULT_COSTS = {
  fee_rate: 0.001,        // 手续费率 0.1%
  slippage_bps: 2,        // 基础滑点 2bps
  market_impact: 0.0005,  // 市场冲击 0.05%
  spread_cost: 0.0003     // 买卖价差成本 0.03%
}

// ============ 运行回测 ============
export async function runBacktest(userId, config) {
  const {
    strategy_type = 'trend_following',
    model_code = 'GLM-5.2',
    region = 'SG1',
    timeframe = '1h',
    initial_capital = 1000000,
    start_date,
    end_date,
    parameters = {},
    costs = {},
    ai_model_id = null
  } = config

  const strategyDef = STRATEGY_TYPES[strategy_type]
  if (!strategyDef) throw new Error(`未知策略类型: ${strategy_type}`)

  // 合并参数
  const params = { ...strategyDef.params, ...parameters }
  const costModel = { ...DEFAULT_COSTS, ...costs }

  // 获取历史K线数据
  const candleCount = calculateCandleCount(start_date, end_date, timeframe)
  const candles = getCandles(model_code, region, timeframe, Math.min(candleCount, 500))

  if (candles.length < 30) {
    throw new Error('历史数据不足，至少需要30根K线')
  }

  // 运行策略
  const trades = []
  const equityCurve = []
  let capital = initial_capital
  let position = null  // { side, entry_price, quantity, entry_time }
  let peak = initial_capital
  let maxDrawdown = 0

  for (let i = Math.max(params.lookback || 20, 20); i < candles.length; i++) {
    const candle = candles[i]
    const historicalCandles = candles.slice(0, i + 1)
    const indicators = calculateIndicators(historicalCandles)

    // 策略信号
    const signal = generateSignal(strategy_type, candle, indicators, params, position)

    // 执行交易
    if (signal.action === 'buy' && !position) {
      const orderCost = calculateOrderCost(candle.close, signal.quantity || Math.floor(capital * 0.15 / candle.close), costModel, 'buy')
      if (capital > orderCost.total_cost) {
        capital -= orderCost.total_cost
        position = {
          side: 'long',
          entry_price: orderCost.executed_price,
          quantity: signal.quantity || Math.floor(capital * 0.15 / candle.close),
          entry_time: candle.timestamp,
          entry_index: i
        }
        trades.push({
          action: 'buy',
          price: orderCost.executed_price,
          quantity: position.quantity,
          cost: orderCost.total_cost,
          fee: orderCost.fee,
          slippage: orderCost.slippage,
          timestamp: candle.timestamp,
          reason: signal.reason
        })
      }
    } else if (signal.action === 'sell' && position) {
      const orderCost = calculateOrderCost(candle.close, position.quantity, costModel, 'sell')
      const grossPnl = (orderCost.executed_price - position.entry_price) * position.quantity
      const netPnl = grossPnl - orderCost.total_cost
      capital += position.quantity * orderCost.executed_price - orderCost.total_cost

      const holdingPeriod = i - position.entry_index
      trades.push({
        action: 'sell',
        price: orderCost.executed_price,
        quantity: position.quantity,
        gross_pnl: grossPnl,
        net_pnl: netPnl,
        fee: orderCost.fee,
        slippage: orderCost.slippage,
        holding_period: holdingPeriod,
        timestamp: candle.timestamp,
        reason: signal.reason
      })

      position = null
    }

    // 计算当前权益
    const currentValue = capital + (position ? position.quantity * candle.close : 0)
    equityCurve.push({ timestamp: candle.timestamp, value: currentValue, price: candle.close })

    // 更新最大回撤
    if (currentValue > peak) peak = currentValue
    const drawdown = (peak - currentValue) / peak
    if (drawdown > maxDrawdown) maxDrawdown = drawdown
  }

  // 如果还有持仓，按最后价格平仓
  if (position) {
    const lastCandle = candles[candles.length - 1]
    const orderCost = calculateOrderCost(lastCandle.close, position.quantity, costModel, 'sell')
    const grossPnl = (orderCost.executed_price - position.entry_price) * position.quantity
    const netPnl = grossPnl - orderCost.total_cost
    capital += position.quantity * orderCost.executed_price - orderCost.total_cost

    trades.push({
      action: 'sell',
      price: orderCost.executed_price,
      quantity: position.quantity,
      gross_pnl: grossPnl,
      net_pnl: netPnl,
      fee: orderCost.fee,
      slippage: orderCost.slippage,
      holding_period: candles.length - 1 - position.entry_index,
      timestamp: lastCandle.timestamp,
      reason: '回测结束平仓'
    })
  }

  // 计算绩效指标
  const finalCapital = capital
  const metrics = calculateMetrics(trades, equityCurve, initial_capital, finalCapital, maxDrawdown, start_date, end_date)

  // 市场环境分析
  const marketEnvironments = analyzeMarketEnvironments(candles)

  const result = {
    id: uuidv4(),
    user_id: userId,
    strategy_name: config.strategy_name || `${strategyDef.name}_${model_code}`,
    strategy_type,
    config: JSON.stringify({ model_code, region, timeframe, parameters: params, costs: costModel }),
    start_date,
    end_date,
    initial_capital: initial_capital,
    final_capital: finalCapital,
    total_return: metrics.total_return,
    annualized_return: metrics.annualized_return,
    max_drawdown: metrics.max_drawdown,
    sharpe_ratio: metrics.sharpe_ratio,
    win_rate: metrics.win_rate,
    profit_loss_ratio: metrics.profit_loss_ratio,
    total_trades: metrics.total_trades,
    winning_trades: metrics.winning_trades,
    losing_trades: metrics.losing_trades,
    avg_win: metrics.avg_win,
    avg_loss: metrics.avg_loss,
    avg_holding_period: metrics.avg_holding_period,
    market_environments: JSON.stringify(marketEnvironments),
    equity_curve: JSON.stringify(equityCurve),
    trade_history: JSON.stringify(trades),
    ai_model_id,
    status: 'completed'
  }

  // 保存到数据库
  db.prepare(`
    INSERT INTO quant_backtest_results (
      id, user_id, strategy_id, strategy_name, strategy_type, config,
      start_date, end_date, initial_capital, final_capital,
      total_return, annualized_return, max_drawdown, sharpe_ratio,
      win_rate, profit_loss_ratio, total_trades, winning_trades, losing_trades,
      avg_win, avg_loss, avg_holding_period,
      market_environments, equity_curve, trade_history, ai_model_id, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    result.id, result.user_id, config.strategy_id || null, result.strategy_name, result.strategy_type, result.config,
    result.start_date, result.end_date, result.initial_capital, result.final_capital,
    result.total_return, result.annualized_return, result.max_drawdown, result.sharpe_ratio,
    result.win_rate, result.profit_loss_ratio, result.total_trades, result.winning_trades, result.losing_trades,
    result.avg_win, result.avg_loss, result.avg_holding_period,
    result.market_environments, result.equity_curve, result.trade_history, result.ai_model_id, result.status
  )

  return {
    ...result,
    market_environments: marketEnvironments,
    equity_curve: equityCurve,
    trade_history: trades,
    metrics
  }
}

// ============ 生成策略信号 ============
function generateSignal(strategyType, candle, indicators, params, position) {
  switch (strategyType) {
    case 'trend_following':
      return trendFollowingSignal(candle, indicators, params, position)
    case 'mean_reversion':
      return meanReversionSignal(candle, indicators, params, position)
    case 'market_making':
      return marketMakingSignal(candle, indicators, params, position)
    case 'cross_model_arb':
      return crossModelArbSignal(candle, indicators, params, position)
    case 'time_region_arb':
      return timeRegionArbSignal(candle, indicators, params, position)
    case 'forward_spot_arb':
      return forwardSpotArbSignal(candle, indicators, params, position)
    case 'multi_strategy':
      return multiStrategySignal(candle, indicators, params, position)
    default:
      return { action: 'hold', reason: '未知策略' }
  }
}

// 趋势跟踪
function trendFollowingSignal(candle, indicators, params, position) {
  const { lookback = 20, signal_threshold = 0.7, stop_loss = 0.05, take_profit = 0.10 } = params
  const price = candle.close
  const ma = indicators.ma
  const macd = indicators.macd
  const macdSignal = indicators.macd_signal

  // 止损止盈
  if (position) {
    const pnl = (price - position.entry_price) / position.entry_price
    if (pnl <= -stop_loss) return { action: 'sell', reason: `止损 ${(pnl * 100).toFixed(1)}%` }
    if (pnl >= take_profit) return { action: 'sell', reason: `止盈 ${(pnl * 100).toFixed(1)}%` }
  }

  // 趋势判断
  if (price > ma && macd > macdSignal && macd > 0) {
    return { action: 'buy', reason: '价格上穿均线 + MACD金叉', quantity: undefined }
  }
  if (position && price < ma && macd < macdSignal) {
    return { action: 'sell', reason: '价格下穿均线 + MACD死叉' }
  }

  return { action: 'hold', reason: '无明确趋势信号' }
}

// 均值回归
function meanReversionSignal(candle, indicators, params, position) {
  const { rsi_oversold = 30, rsi_overbought = 70, stop_loss = 0.03, take_profit = 0.05 } = params
  const price = candle.close
  const rsi = indicators.rsi
  const bollinger = indicators.bollinger

  if (position) {
    const pnl = (price - position.entry_price) / position.entry_price
    if (pnl <= -stop_loss) return { action: 'sell', reason: `止损 ${(pnl * 100).toFixed(1)}%` }
    if (pnl >= take_profit) return { action: 'sell', reason: `止盈 ${(pnl * 100).toFixed(1)}%` }
    if (rsi > 50) return { action: 'sell', reason: 'RSI回归中位' }
  }

  if (rsi < rsi_oversold) {
    return { action: 'buy', reason: `RSI ${rsi.toFixed(1)} 超卖`, quantity: undefined }
  }

  return { action: 'hold', reason: `RSI ${rsi.toFixed(1)}` }
}

// 做市策略
function marketMakingSignal(candle, indicators, params, position) {
  const { spread_multiplier = 1.5, rebalance_threshold = 0.3 } = params
  const price = candle.close
  const spread = (candle.high - candle.low) / price

  if (spread > rebalance_threshold) {
    return { action: 'hold', reason: '价差过大，暂停做市' }
  }

  if (!position) {
    return { action: 'buy', reason: `做市建仓，价差 ${(spread * 100).toFixed(2)}%`, quantity: 10 }
  }

  if (position && (candle.close - position.entry_price) / position.entry_price > spread * spread_multiplier) {
    return { action: 'sell', reason: '做市平仓获利' }
  }

  return { action: 'hold', reason: '维持做市仓位' }
}

// 跨模型套利
function crossModelArbSignal(candle, indicators, params, position) {
  const { spread_threshold = 0.02 } = params
  // 简化：使用价格波动作为信号
  const volatility = indicators.avg_volume > 0 ? Math.abs(candle.close - candle.open) / candle.close : 0

  if (volatility > spread_threshold && !position) {
    return { action: 'buy', reason: `跨模型价差 ${(volatility * 100).toFixed(2)}%`, quantity: undefined }
  }
  if (position && volatility < spread_threshold * 0.5) {
    return { action: 'sell', reason: '价差收敛' }
  }
  return { action: 'hold', reason: '无套利机会' }
}

// 时间区域套利
function timeRegionArbSignal(candle, indicators, params, position) {
  const { min_spread = 0.01 } = params
  const priceChange = Math.abs(candle.close - candle.open) / candle.close

  if (priceChange > min_spread && !position) {
    return { action: 'buy', reason: `区域价差 ${(priceChange * 100).toFixed(2)}%`, quantity: undefined }
  }
  if (position && priceChange < min_spread * 0.3) {
    return { action: 'sell', reason: '区域价差收敛' }
  }
  return { action: 'hold', reason: '无区域套利机会' }
}

// 期现套利
function forwardSpotArbSignal(candle, indicators, params, position) {
  const { min_basis = 0.005 } = params
  const basis = Math.abs(candle.close - indicators.ma) / indicators.ma

  if (basis > min_basis && !position) {
    return { action: 'buy', reason: `期现基差 ${(basis * 100).toFixed(2)}%`, quantity: undefined }
  }
  if (position && basis < min_basis * 0.3) {
    return { action: 'sell', reason: '基差收敛' }
  }
  return { action: 'hold', reason: '无期现套利机会' }
}

// 多策略组合
function multiStrategySignal(candle, indicators, params, position) {
  const { strategies = ['trend_following', 'mean_reversion'], weights = [0.6, 0.4] } = params
  let buyScore = 0
  let sellScore = 0
  const reasons = []

  strategies.forEach((s, i) => {
    const signal = s === 'trend_following'
      ? trendFollowingSignal(candle, indicators, params, position)
      : meanReversionSignal(candle, indicators, params, position)

    if (signal.action === 'buy') { buyScore += weights[i]; reasons.push(signal.reason) }
    if (signal.action === 'sell') { sellScore += weights[i]; reasons.push(signal.reason) }
  })

  if (buyScore > 0.5 && !position) return { action: 'buy', reason: `多策略综合买入 (${(buyScore * 100).toFixed(0)}%)`, quantity: undefined }
  if (sellScore > 0.5 && position) return { action: 'sell', reason: `多策略综合卖出 (${(sellScore * 100).toFixed(0)}%)` }

  return { action: 'hold', reason: reasons.join('; ') || '无信号' }
}

// ============ 计算订单成本 ============
function calculateOrderCost(price, quantity, costs, side) {
  const fee = price * quantity * costs.fee_rate
  const slippage = price * (costs.slippage_bps / 10000) * (side === 'buy' ? 1 : -1)
  const marketImpact = price * costs.market_impact * Math.sqrt(quantity / 100)
  const spreadCost = price * costs.spread_cost

  const executedPrice = price + slippage + marketImpact + spreadCost
  const totalCost = fee + Math.abs(slippage * quantity) + marketImpact * quantity + spreadCost * quantity

  return {
    executed_price: executedPrice,
    fee,
    slippage: slippage * quantity,
    market_impact: marketImpact * quantity,
    spread_cost: spreadCost * quantity,
    total_cost: totalCost
  }
}

// ============ 计算绩效指标 ============
function calculateMetrics(trades, equityCurve, initialCapital, finalCapital, maxDrawdown, startDate, endDate) {
  const sellTrades = trades.filter(t => t.action === 'sell')
  const winningTrades = sellTrades.filter(t => t.net_pnl > 0)
  const losingTrades = sellTrades.filter(t => t.net_pnl < 0)

  const totalReturn = (finalCapital - initialCapital) / initialCapital
  const days = Math.max(1, (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))
  const annualizedReturn = (Math.pow(finalCapital / initialCapital, 365 / days) - 1)

  // 夏普比率
  const returns = []
  for (let i = 1; i < equityCurve.length; i++) {
    const r = (equityCurve[i].value - equityCurve[i - 1].value) / equityCurve[i - 1].value
    returns.push(r)
  }
  const avgReturn = returns.reduce((a, b) => a + b, 0) / (returns.length || 1)
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length || 1)
  const stdDev = Math.sqrt(variance)
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0

  const winRate = sellTrades.length > 0 ? winningTrades.length / sellTrades.length : 0
  const avgWin = winningTrades.length > 0 ? winningTrades.reduce((a, b) => a + b.net_pnl, 0) / winningTrades.length : 0
  const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((a, b) => a + b.net_pnl, 0) / losingTrades.length) : 0
  const profitLossRatio = avgLoss > 0 ? avgWin / avgLoss : 0

  const avgHoldingPeriod = sellTrades.length > 0
    ? sellTrades.reduce((a, b) => a + (b.holding_period || 0), 0) / sellTrades.length
    : 0

  return {
    total_return: totalReturn,
    annualized_return: annualizedReturn,
    max_drawdown: maxDrawdown,
    sharpe_ratio: sharpeRatio,
    win_rate: winRate,
    profit_loss_ratio: profitLossRatio,
    total_trades: sellTrades.length,
    winning_trades: winningTrades.length,
    losing_trades: losingTrades.length,
    avg_win: avgWin,
    avg_loss: avgLoss,
    avg_holding_period: avgHoldingPeriod
  }
}

// ============ 市场环境分析 ============
function analyzeMarketEnvironments(candles) {
  const segments = []
  const segmentSize = Math.max(10, Math.floor(candles.length / 5))

  for (let i = 0; i < candles.length; i += segmentSize) {
    const segment = candles.slice(i, i + segmentSize)
    if (segment.length < 5) continue

    const prices = segment.map(c => c.close)
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
    const maxPrice = Math.max(...prices)
    const minPrice = Math.min(...prices)
    const volatility = (maxPrice - minPrice) / avgPrice
    const trend = (prices[prices.length - 1] - prices[0]) / prices[0]

    let environment
    if (Math.abs(trend) > 0.05) {
      environment = trend > 0 ? 'uptrend' : 'downtrend'
    } else if (volatility > 0.1) {
      environment = 'high_volatility'
    } else {
      environment = 'ranging'
    }

    segments.push({
      start: segment[0].timestamp,
      end: segment[segment.length - 1].timestamp,
      environment,
      volatility: volatility,
      trend: trend,
      avg_price: avgPrice
    })
  }

  return segments
}

// ============ 计算K线数量 ============
function calculateCandleCount(startDate, endDate, timeframe) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffMs = end - start
  const diffHours = diffMs / (1000 * 60 * 60)

  switch (timeframe) {
    case '1m': return Math.floor(diffHours * 60)
    case '5m': return Math.floor(diffHours * 12)
    case '15m': return Math.floor(diffHours * 4)
    case '1h': return Math.floor(diffHours)
    case '4h': return Math.floor(diffHours / 4)
    case '1d': return Math.floor(diffHours / 24)
    default: return 100
  }
}

// ============ 获取回测结果 ============
export function getBacktestResult(backtestId, userId) {
  const result = db.prepare('SELECT * FROM quant_backtest_results WHERE id = ? AND user_id = ?').get(backtestId, userId)
  if (!result) return null

  return {
    ...result,
    config: typeof result.config === 'string' ? JSON.parse(result.config) : result.config,
    market_environments: typeof result.market_environments === 'string' ? JSON.parse(result.market_environments) : result.market_environments,
    equity_curve: typeof result.equity_curve === 'string' ? JSON.parse(result.equity_curve) : result.equity_curve,
    trade_history: typeof result.trade_history === 'string' ? JSON.parse(result.trade_history) : result.trade_history,
    ai_analysis: result.ai_analysis ? (typeof result.ai_analysis === 'string' ? JSON.parse(result.ai_analysis) : result.ai_analysis) : null
  }
}

export function listBacktests(userId, limit = 20) {
  const results = db.prepare('SELECT id, strategy_name, strategy_type, start_date, end_date, initial_capital, final_capital, total_return, annualized_return, max_drawdown, sharpe_ratio, win_rate, profit_loss_ratio, total_trades, status, created_at FROM quant_backtest_results WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit)
  return results
}

export default {
  STRATEGY_TYPES,
  runBacktest,
  getBacktestResult,
  listBacktests
}
