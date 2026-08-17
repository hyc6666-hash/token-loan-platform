/**
 * 模拟交易引擎（纸面交易）
 *
 * 在真实市场环境中使用模拟资金运行策略：
 * - 网络延迟模拟（50-200ms）
 * - 滑点模型
 * - 实时市场数据集成
 * - 与回测结果匹配度比较
 * - 模拟资金管理
 */

import { v4 as uuidv4 } from 'uuid'
import db from '../database/quant-init.js'
import { getMarketQuote, calculateIndicators, getCandles } from './marketData.js'
import { scrapeKaiMarket } from './kaiScraper.js'

// 模拟交易状态
const paperTradingState = new Map() // userId -> { capital, positions, trades, config }

// ============ 初始化模拟交易 ============
export function initPaperTrading(userId, config) {
  const {
    initial_capital = 1000000,
    backtest_id = null,
    strategy_id = null,
    strategy_type = 'trend_following',
    model_code = 'GLM-5.2',
    region = 'SG1',
    latency_ms = 100,
    slippage_bps = 3,
    fee_rate = 0.001
  } = config

  const state = {
    user_id: userId,
    initial_capital: initial_capital,
    available_capital: initial_capital,
    frozen_capital: 0,
    positions: [],
    trades: [],
    config: {
      backtest_id,
      strategy_id,
      strategy_type,
      model_code,
      region,
      latency_ms,
      slippage_bps,
      fee_rate
    },
    started_at: new Date().toISOString(),
    status: 'running'
  }

  paperTradingState.set(userId, state)
  return state
}

// ============ 执行模拟交易 ============
export async function executePaperTrade(userId, orderData) {
  const state = paperTradingState.get(userId)
  if (!state) throw new Error('模拟交易未初始化，请先调用 initPaperTrading')

  const { model_code, side, order_type = 'market', price, quantity, region = 'SG1' } = orderData

  // 模拟网络延迟
  const latency = state.config.latency_ms || 100
  await new Promise(resolve => setTimeout(resolve, Math.min(latency, 500)))

  // 获取实时价格
  let currentPrice
  try {
    const marketData = await scrapeKaiMarket()
    currentPrice = marketData.latestPrice || price
  } catch {
    const quote = getMarketQuote(model_code, region)
    currentPrice = quote?.price || price
  }

  // 计算滑点
  const slippage = currentPrice * (state.config.slippage_bps / 10000) * (side === 'buy' ? 1 : -1)
  const executedPrice = currentPrice + slippage
  const fee = executedPrice * quantity * state.config.fee_rate
  const totalCost = executedPrice * quantity + fee

  // 检查资金
  if (side === 'buy' && totalCost > state.available_capital) {
    return {
      success: false,
      message: '资金不足',
      available_capital: state.available_capital,
      required: totalCost
    }
  }

  const tradeId = uuidv4()
  const trade = {
    id: tradeId,
    user_id: userId,
    strategy_id: state.config.strategy_id,
    backtest_id: state.config.backtest_id,
    model_code,
    region,
    side,
    order_type,
    price: currentPrice,
    quantity,
    filled_price: executedPrice,
    filled_quantity: quantity,
    status: 'filled',
    simulated_latency_ms: latency,
    slippage_bps: state.config.slippage_bps,
    fee,
    pnl: 0,
    match_backtest: 0,
    notes: orderData.reason || '',
    created_at: new Date().toISOString()
  }

  // 更新资金和持仓
  if (side === 'buy') {
    state.available_capital -= totalCost
    state.positions.push({
      model_code,
      side: 'long',
      entry_price: executedPrice,
      quantity,
      entry_time: trade.created_at,
      fee
    })
  } else if (side === 'sell') {
    // 找到对应持仓
    const posIdx = state.positions.findIndex(p => p.model_code === model_code && p.side === 'long')
    if (posIdx >= 0) {
      const pos = state.positions[posIdx]
      const grossPnl = (executedPrice - pos.entry_price) * quantity
      const netPnl = grossPnl - fee
      trade.pnl = netPnl
      state.available_capital += executedPrice * quantity - fee

      // 检查与回测匹配度
      trade.match_backtest = checkBacktestMatch(state, trade, netPnl)

      state.positions.splice(posIdx, 1)
    }
  }

  state.trades.push(trade)

  // 保存到数据库
  db.prepare(`
    INSERT INTO quant_paper_trades (
      id, user_id, strategy_id, backtest_id, model_code, region,
      side, order_type, price, quantity, filled_price, filled_quantity,
      status, simulated_latency_ms, slippage_bps, fee, pnl, match_backtest, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    trade.id, trade.user_id, trade.strategy_id, trade.backtest_id, trade.model_code, trade.region,
    trade.side, trade.order_type, trade.price, trade.quantity, trade.filled_price, trade.filled_quantity,
    trade.status, trade.simulated_latency_ms, trade.slippage_bps, trade.fee, trade.pnl, trade.match_backtest, trade.notes
  )

  return {
    success: true,
    trade,
    state: getPaperTradingSummary(state)
  }
}

// ============ 检查与回测匹配度 ============
function checkBacktestMatch(state, trade, pnl) {
  if (!state.config.backtest_id) return 0

  const backtest = db.prepare('SELECT trade_history FROM quant_backtest_results WHERE id = ?').get(state.config.backtest_id)
  if (!backtest || !backtest.trade_history) return 0

  const backtestTrades = typeof backtest.trade_history === 'string' ? JSON.parse(backtest.trade_history) : backtest.trade_history
  const sellTrades = backtestTrades.filter(t => t.action === 'sell')

  // 找最接近的回测交易
  let bestMatch = 0
  for (const bt of sellTrades) {
    if (bt.action === trade.side) {
      const pnlDiff = Math.abs(bt.net_pnl - pnl) / (Math.abs(bt.net_pnl) + 1)
      const matchScore = 1 - pnlDiff
      if (matchScore > bestMatch) bestMatch = matchScore
    }
  }

  return bestMatch > 0.8 ? 1 : 0
}

// ============ 获取模拟交易摘要 ============
export function getPaperTradingSummary(state) {
  const sellTrades = state.trades.filter(t => t.side === 'sell')
  const winningTrades = sellTrades.filter(t => t.pnl > 0)
  const losingTrades = sellTrades.filter(t => t.pnl < 0)

  const totalPnl = sellTrades.reduce((a, b) => a + b.pnl, 0)
  const positionsValue = state.positions.reduce((sum, p) => {
    const quote = getMarketQuote(p.model_code, state.config.region)
    return sum + (quote?.price || p.entry_price) * p.quantity
  }, 0)

  const totalValue = state.available_capital + positionsValue
  const matchRate = sellTrades.length > 0
    ? sellTrades.filter(t => t.match_backtest === 1).length / sellTrades.length
    : 0

  return {
    initial_capital: state.initial_capital,
    available_capital: state.available_capital,
    positions_value: positionsValue,
    total_value: totalValue,
    total_pnl: totalPnl,
    total_return: (totalValue - state.initial_capital) / state.initial_capital,
    open_positions: state.positions.length,
    total_trades: state.trades.length,
    sell_trades: sellTrades.length,
    winning_trades: winningTrades.length,
    losing_trades: losingTrades.length,
    win_rate: sellTrades.length > 0 ? winningTrades.length / sellTrades.length : 0,
    avg_win: winningTrades.length > 0 ? winningTrades.reduce((a, b) => a + b.pnl, 0) / winningTrades.length : 0,
    avg_loss: losingTrades.length > 0 ? Math.abs(losingTrades.reduce((a, b) => a + b.pnl, 0) / losingTrades.length) : 0,
    match_rate: matchRate,
    started_at: state.started_at,
    status: state.status,
    config: state.config
  }
}

// ============ 获取模拟交易状态 ============
export function getPaperTradingState(userId) {
  const state = paperTradingState.get(userId)
  if (!state) return null
  return {
    ...getPaperTradingSummary(state),
    positions: state.positions,
    recent_trades: state.trades.slice(-20)
  }
}

// ============ 自动运行模拟交易 ============
export async function autoRunPaperTrading(userId) {
  const state = paperTradingState.get(userId)
  if (!state || state.status !== 'running') return null

  const { model_code, region, strategy_type } = state.config

  // 获取实时市场数据
  let marketData
  try {
    marketData = await scrapeKaiMarket()
  } catch {
    marketData = null
  }

  const candles = getCandles(model_code, region, '1h', 50)
  const indicators = calculateIndicators(candles)
  const currentPrice = marketData?.latestPrice || candles[candles.length - 1]?.close || 0

  // 简单策略信号
  const hasPosition = state.positions.some(p => p.model_code === model_code)
  let signal = { action: 'hold', reason: '无信号' }

  if (strategy_type === 'trend_following') {
    if (!hasPosition && indicators.macd > indicators.macd_signal && indicators.rsi < 70) {
      signal = { action: 'buy', reason: 'MACD金叉 + RSI未超买' }
    } else if (hasPosition && indicators.macd < indicators.macd_signal) {
      signal = { action: 'sell', reason: 'MACD死叉' }
    }
  } else if (strategy_type === 'mean_reversion') {
    if (!hasPosition && indicators.rsi < 30) {
      signal = { action: 'buy', reason: 'RSI超卖' }
    } else if (hasPosition && indicators.rsi > 50) {
      signal = { action: 'sell', reason: 'RSI回归' }
    }
  }

  if (signal.action !== 'hold') {
    const quantity = Math.floor(state.available_capital * 0.1 / currentPrice) || 1
    if (quantity > 0) {
      return await executePaperTrade(userId, {
        model_code,
        side: signal.action,
        order_type: 'market',
        price: currentPrice,
        quantity,
        region,
        reason: signal.reason
      })
    }
  }

  return { signal, state: getPaperTradingSummary(state) }
}

// ============ 停止模拟交易 ============
export function stopPaperTrading(userId) {
  const state = paperTradingState.get(userId)
  if (!state) return null

  state.status = 'stopped'
  const summary = getPaperTradingSummary(state)
  paperTradingState.delete(userId)
  return summary
}

export default {
  initPaperTrading,
  executePaperTrade,
  getPaperTradingState,
  getPaperTradingSummary,
  autoRunPaperTrading,
  stopPaperTrading
}
