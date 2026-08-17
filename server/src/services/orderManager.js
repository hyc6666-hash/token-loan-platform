/**
 * 订单管理器
 * 
 * 功能：
 * 1. 创建订单（手动/策略自动）
 * 2. 撤销订单
 * 3. 订单成交处理
 * 4. 持仓管理
 * 5. 交易记录
 */

import db from '../database/quant-init.js'
import { v4 as uuidv4 } from 'uuid'
import { getMarketQuote, getModelByCode } from './marketData.js'
import { preTradeCheck } from './riskEngine.js'

// ============ 创建订单 ============
export async function createOrder(userId, orderData) {
  const orderId = uuidv4()
  
  // 获取当前市场价格（如果是市价单）
  let price = orderData.price
  if (orderData.order_type === 'market') {
    const quote = getMarketQuote(orderData.model_code, orderData.region || 'SG1')
    price = orderData.side === 'buy' ? quote.ask : quote.bid
  }
  
  const order = {
    id: orderId,
    user_id: userId,
    model_code: orderData.model_code,
    region: orderData.region || 'SG1',
    side: orderData.side,
    order_type: orderData.order_type || 'limit',
    price,
    quantity: orderData.quantity,
    filled_quantity: 0,
    avg_fill_price: 0,
    status: 'pending',
    strategy_id: orderData.strategy_id || null,
    contract_type: orderData.contract_type || 'firm',
    delivery_date: orderData.delivery_date || null,
    time_in_force: orderData.time_in_force || 'GTC',
    expires_at: orderData.expires_at || null,
    notes: orderData.notes || null
  }
  
  // 事前风控检查
  const riskCheck = preTradeCheck(userId, {
    ...order,
    leverage: orderData.leverage || 1
  })
  
  if (!riskCheck.passed) {
    return {
      success: false,
      errors: riskCheck.errors,
      warnings: riskCheck.warnings,
      message: riskCheck.errors[0]?.message || '风控检查未通过'
    }
  }
  
  // 保存订单
  db.prepare(`
    INSERT INTO quant_orders (id, user_id, model_code, region, side, order_type, price, quantity, 
      filled_quantity, avg_fill_price, status, strategy_id, contract_type, delivery_date, 
      time_in_force, expires_at, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    order.id, order.user_id, order.model_code, order.region, order.side, order.order_type,
    order.price, order.quantity, order.filled_quantity, order.avg_fill_price, order.status,
    order.strategy_id, order.contract_type, order.delivery_date, order.time_in_force,
    order.expires_at, order.notes
  )
  
  // 冻结资金
  const orderValue = order.price * order.quantity
  db.prepare(`
    UPDATE quant_capital 
    SET available_capital = available_capital - ?, frozen_capital = frozen_capital + ?,
        updated_at = datetime('now', 'localtime')
    WHERE user_id = ?
  `).run(orderValue, orderValue, userId)
  
  // 模拟成交（当前阶段：手动模式下立即部分成交）
  if (orderData.order_type === 'market' || orderData.auto_fill) {
    fillOrder(orderId, userId, order.quantity, order.price)
  }
  
  return {
    success: true,
    order: db.prepare('SELECT * FROM quant_orders WHERE id = ?').get(orderId),
    warnings: riskCheck.warnings
  }
}

// ============ 订单成交 ============
export function fillOrder(orderId, userId, fillQuantity, fillPrice) {
  const order = db.prepare('SELECT * FROM quant_orders WHERE id = ? AND user_id = ?').get(orderId, userId)
  if (!order) return { success: false, message: '订单不存在' }
  
  if (order.status === 'cancelled' || order.status === 'filled') {
    return { success: false, message: `订单状态为 ${order.status}，无法成交` }
  }
  
  const newFilledQty = order.filled_quantity + fillQuantity
  const newAvgPrice = (order.avg_fill_price * order.filled_quantity + fillPrice * fillQuantity) / newFilledQty
  const fillValue = fillPrice * fillQuantity
  const fee = fillValue * 0.001 // 0.1% 手续费
  
  // 更新订单
  const newStatus = newFilledQty >= order.quantity ? 'filled' : 'partial'
  db.prepare(`
    UPDATE quant_orders 
    SET filled_quantity = ?, avg_fill_price = ?, status = ?, updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `).run(newFilledQty, newAvgPrice, newStatus, orderId)
  
  // 解冻资金并扣除
  db.prepare(`
    UPDATE quant_capital 
    SET frozen_capital = frozen_capital - ?, 
        available_capital = available_capital + ? - ?,
        updated_at = datetime('now', 'localtime')
    WHERE user_id = ?
  `).run(fillValue, fillValue, fillValue + fee, userId)
  
  // 创建交易记录
  const tradeId = uuidv4()
  db.prepare(`
    INSERT INTO quant_trades (id, user_id, order_id, model_code, region, side, price, quantity, value, fee, strategy_id, contract_type, delivery_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    tradeId, userId, orderId, order.model_code, order.region, order.side,
    fillPrice, fillQuantity, fillValue, fee, order.strategy_id, order.contract_type, order.delivery_date
  )
  
  // 更新持仓
  updatePosition(userId, order, fillQuantity, fillPrice)
  
  return {
    success: true,
    trade_id: tradeId,
    order_status: newStatus,
    filled_quantity: newFilledQty,
    avg_fill_price: newAvgPrice
  }
}

// ============ 更新持仓 ============
function updatePosition(userId, order, fillQuantity, fillPrice) {
  const side = order.side === 'buy' ? 'long' : 'short'
  
  // 查找现有持仓
  let position = db.prepare(`
    SELECT * FROM quant_positions 
    WHERE user_id = ? AND model_code = ? AND region = ? AND side = ? AND status = 'open'
  `).get(userId, order.model_code, order.region, side)
  
  if (position) {
    // 更新现有持仓
    const newQty = position.side === 'long' 
      ? position.quantity + fillQuantity 
      : position.quantity - fillQuantity
    
    if (Math.abs(newQty) < 0.0001) {
      // 平仓
      const realizedPnL = (fillPrice - position.avg_price) * position.quantity * (position.side === 'long' ? 1 : -1)
      db.prepare(`
        UPDATE quant_positions 
        SET quantity = 0, realized_pnl = ?, status = 'closed', updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(position.realized_pnl + realizedPnL, position.id)
    } else {
      // 加仓
      const newAvgPrice = (position.avg_price * position.quantity + fillPrice * fillQuantity) / (position.quantity + fillQuantity)
      db.prepare(`
        UPDATE quant_positions 
        SET quantity = ?, avg_price = ?, margin = margin + ?, updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(newQty, newAvgPrice, fillPrice * fillQuantity, position.id)
    }
  } else {
    // 新建持仓
    const posId = uuidv4()
    db.prepare(`
      INSERT INTO quant_positions (id, user_id, model_code, region, side, quantity, avg_price, current_price, margin, leverage, strategy_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')
    `).run(
      posId, userId, order.model_code, order.region, side,
      fillQuantity, fillPrice, fillPrice, fillPrice * fillQuantity,
      order.leverage || 1, order.strategy_id
    )
  }
}

// ============ 撤销订单 ============
export function cancelOrder(orderId, userId) {
  const order = db.prepare('SELECT * FROM quant_orders WHERE id = ? AND user_id = ?').get(orderId, userId)
  if (!order) return { success: false, message: '订单不存在' }
  
  if (order.status === 'filled') return { success: false, message: '订单已完全成交' }
  if (order.status === 'cancelled') return { success: false, message: '订单已撤销' }
  
  // 退回冻结资金
  const unfilledQty = order.quantity - order.filled_quantity
  const unfrozenValue = unfilledQty * order.price
  
  db.prepare(`
    UPDATE quant_capital 
    SET frozen_capital = frozen_capital - ?, 
        available_capital = available_capital + ?,
        updated_at = datetime('now', 'localtime')
    WHERE user_id = ?
  `).run(unfrozenValue, unfrozenValue, userId)
  
  // 更新订单状态
  db.prepare(`
    UPDATE quant_orders SET status = 'cancelled', updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `).run(orderId)
  
  return { success: true, message: '订单已撤销' }
}

// ============ 获取订单列表 ============
export function getOrders(userId, options = {}) {
  const { status, limit = 50, offset = 0 } = options
  let query = 'SELECT * FROM quant_orders WHERE user_id = ?'
  const params = [userId]
  
  if (status) {
    query += ' AND status = ?'
    params.push(status)
  }
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)
  
  return db.prepare(query).all(...params)
}

// ============ 获取持仓列表 ============
export function getPositions(userId, status = 'open') {
  const positions = db.prepare(`
    SELECT * FROM quant_positions WHERE user_id = ? AND status = ? ORDER BY created_at DESC
  `).all(userId, status)
  
  // 更新当前价格和浮盈
  return positions.map(p => {
    const quote = getMarketQuote(p.model_code, p.region)
    const currentPrice = quote ? quote.price : p.current_price
    const unrealizedPnL = (currentPrice - p.avg_price) * p.quantity * (p.side === 'long' ? 1 : -1)
    const pnlPct = p.avg_price > 0 ? (unrealizedPnL / (p.avg_price * p.quantity)) * 100 : 0
    
    return {
      ...p,
      current_price: currentPrice,
      unrealized_pnl: unrealizedPnL,
      pnl_pct: pnlPct,
      position_value: p.quantity * currentPrice
    }
  })
}

// ============ 获取交易记录 ============
export function getTrades(userId, options = {}) {
  const { limit = 50, offset = 0, strategy_id } = options
  let query = 'SELECT * FROM quant_trades WHERE user_id = ?'
  const params = [userId]
  
  if (strategy_id) {
    query += ' AND strategy_id = ?'
    params.push(strategy_id)
  }
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)
  
  return db.prepare(query).all(...params)
}

// ============ 平仓 ============
export function closePosition(positionId, userId) {
  const position = db.prepare('SELECT * FROM quant_positions WHERE id = ? AND user_id = ? AND status = ?').get(positionId, userId, 'open')
  if (!position) return { success: false, message: '持仓不存在或已平仓' }
  
  const quote = getMarketQuote(position.model_code, position.region)
  const closePrice = position.side === 'long' ? quote.bid : quote.ask
  const realizedPnL = (closePrice - position.avg_price) * position.quantity * (position.side === 'long' ? 1 : -1)
  const closeValue = closePrice * position.quantity
  const fee = closeValue * 0.001
  
  // 创建平仓订单
  const orderId = uuidv4()
  const closeSide = position.side === 'long' ? 'sell' : 'buy'
  
  db.prepare(`
    INSERT INTO quant_orders (id, user_id, model_code, region, side, order_type, price, quantity, filled_quantity, avg_fill_price, status, strategy_id, contract_type)
    VALUES (?, ?, ?, ?, ?, 'market', ?, ?, ?, ?, 'filled', ?, 'firm')
  `).run(orderId, userId, position.model_code, position.region, closeSide, closePrice, position.quantity, position.quantity, closePrice, position.strategy_id)
  
  // 创建交易记录
  const tradeId = uuidv4()
  db.prepare(`
    INSERT INTO quant_trades (id, user_id, order_id, model_code, region, side, price, quantity, value, pnl, fee, strategy_id, contract_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'firm')
  `).run(tradeId, userId, orderId, position.model_code, position.region, closeSide, closePrice, position.quantity, closeValue, realizedPnL, fee, position.strategy_id)
  
  // 更新持仓
  db.prepare(`
    UPDATE quant_positions 
    SET status = 'closed', realized_pnl = ?, current_price = ?, unrealized_pnl = 0,
        updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `).run(realizedPnL, closePrice, positionId)
  
  // 更新资金
  db.prepare(`
    UPDATE quant_capital 
    SET available_capital = available_capital + ? - ?,
        frozen_capital = frozen_capital - ?,
        updated_at = datetime('now', 'localtime')
    WHERE user_id = ?
  `).run(closeValue, fee, position.margin, userId)
  
  return {
    success: true,
    realized_pnl: realizedPnL,
    pnl_pct: (realizedPnL / (position.avg_price * position.quantity)) * 100,
    close_price: closePrice,
    fee
  }
}

// ============ 获取投资组合概览 ============
export function getPortfolioOverview(userId) {
  const capital = db.prepare('SELECT * FROM quant_capital WHERE user_id = ?').get(userId)
  const positions = getPositions(userId, 'open')
  const pendingOrders = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(price * (quantity - filled_quantity)), 0) as frozen
    FROM quant_orders WHERE user_id = ? AND status IN ('pending', 'partial')
  `).get(userId)
  
  const todayTrades = db.prepare(`
    SELECT COALESCE(SUM(pnl), 0) as pnl, COUNT(*) as count
    FROM quant_trades WHERE user_id = ? AND date(created_at) = date('now', 'localtime')
  `).get(userId)
  
  const totalExposure = positions.reduce((sum, p) => sum + p.position_value, 0)
  const totalUnrealizedPnL = positions.reduce((sum, p) => sum + p.unrealized_pnl, 0)
  const totalMargin = positions.reduce((sum, p) => sum + p.margin, 0)
  
  return {
    capital: capital || { total_capital: 0, available_capital: 0, frozen_capital: 0 },
    positions,
    summary: {
      total_capital: capital?.total_capital || 0,
      available_capital: capital?.available_capital || 0,
      frozen_capital: capital?.frozen_capital || 0,
      pending_orders: pendingOrders.count,
      pending_frozen: pendingOrders.frozen,
      total_exposure: totalExposure,
      total_unrealized_pnl: totalUnrealizedPnL,
      total_margin: totalMargin,
      today_pnl: todayTrades.pnl,
      today_trades: todayTrades.count,
      net_value: (capital?.total_capital || 0) + totalUnrealizedPnL,
      exposure_ratio: capital?.total_capital > 0 ? totalExposure / capital.total_capital : 0,
      pnl_ratio: capital?.total_capital > 0 ? totalUnrealizedPnL / capital.total_capital : 0
    }
  }
}
