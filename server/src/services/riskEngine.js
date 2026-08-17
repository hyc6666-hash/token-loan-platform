/**
 * 风控引擎 - 核心模块
 * 
 * 风控体系架构：
 * 1. 事前风控：下单前检查（仓位限制、杠杆限制、集中度）
 * 2. 事中风控：实时监控（浮亏、回撤、保证金）
 * 3. 事后风控：止损止盈、强制平仓、熔断
 * 
 * 风控规则层级：
 * - info: 信息提示
 * - warning: 警告（减仓建议）
 * - critical: 严重（暂停交易）
 * - breach: 违约（强制平仓）
 */

import db from '../database/quant-init.js'
import { v4 as uuidv4 } from 'uuid'
import { getMarketQuote, getModelByCode } from './marketData.js'

// ============ 获取用户风控配置 ============
export function getRiskConfig(userId) {
  let config = db.prepare('SELECT * FROM quant_capital WHERE user_id = ?').get(userId)
  
  if (!config) {
    // 创建默认配置
    config = {
      id: uuidv4(),
      user_id: userId,
      total_capital: 0,
      available_capital: 0,
      frozen_capital: 0,
      risk_tolerance: 'moderate',
      max_single_position: 0.10,
      max_total_exposure: 0.80,
      daily_loss_limit: 0.05,
      max_drawdown: 0.15
    }
    db.prepare(`
      INSERT INTO quant_capital (id, user_id, total_capital, available_capital, frozen_capital, risk_tolerance, max_single_position, max_total_exposure, daily_loss_limit, max_drawdown)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      config.id, config.user_id, config.total_capital, config.available_capital,
      config.frozen_capital, config.risk_tolerance, config.max_single_position,
      config.max_total_exposure, config.daily_loss_limit, config.max_drawdown
    )
  }
  
  return config
}

// ============ 更新资金配置 ============
export function updateCapitalConfig(userId, updates) {
  const config = getRiskConfig(userId)
  
  const updated = {
    ...config,
    ...updates,
    updated_at: new Date().toISOString()
  }
  
  // 如果更新了总资金，自动调整可用资金
  if (updates.total_capital !== undefined) {
    const usedCapital = config.total_capital - config.available_capital
    updated.available_capital = Math.max(0, updates.total_capital - usedCapital)
  }
  
  db.prepare(`
    UPDATE quant_capital 
    SET total_capital = ?, available_capital = ?, frozen_capital = ?, 
        risk_tolerance = ?, max_single_position = ?, max_total_exposure = ?,
        daily_loss_limit = ?, max_drawdown = ?, updated_at = datetime('now', 'localtime')
    WHERE user_id = ?
  `).run(
    updated.total_capital, updated.available_capital, updated.frozen_capital,
    updated.risk_tolerance, updated.max_single_position, updated.max_total_exposure,
    updated.daily_loss_limit, updated.max_drawdown, userId
  )
  
  return updated
}

// ============ 获取风控规则 ============
export function getRiskRules(userId) {
  let rules = db.prepare('SELECT * FROM quant_risk_rules WHERE user_id = ? AND enabled = 1').all(userId)
  
  if (rules.length === 0) {
    // 从管理员模板复制
    const template = db.prepare("SELECT * FROM quant_risk_rules WHERE user_id IN (SELECT id FROM users WHERE role = 'admin')").all()
    
    if (template.length > 0) {
      const insert = db.prepare(`
        INSERT INTO quant_risk_rules (id, user_id, rule_type, threshold, current_value, severity, action, enabled)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `)
      
      for (const t of template) {
        insert.run(uuidv4(), userId, t.rule_type, t.threshold, 0, t.severity, t.action)
      }
      
      rules = db.prepare('SELECT * FROM quant_risk_rules WHERE user_id = ? AND enabled = 1').all(userId)
    }
  }
  
  return rules
}

// ============ 更新风控规则 ============
export function updateRiskRule(ruleId, updates) {
  const fields = []
  const values = []
  
  for (const [key, val] of Object.entries(updates)) {
    if (['threshold', 'current_value', 'severity', 'action', 'enabled'].includes(key)) {
      fields.push(`${key} = ?`)
      values.push(val)
    }
  }
  
  if (fields.length === 0) return null
  
  fields.push("updated_at = datetime('now', 'localtime')")
  values.push(ruleId)
  
  db.prepare(`UPDATE quant_risk_rules SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return db.prepare('SELECT * FROM quant_risk_rules WHERE id = ?').get(ruleId)
}

// ============ 事前风控：下单前检查 ============
export function preTradeCheck(userId, order) {
  const config = getRiskConfig(userId)
  const rules = getRiskRules(userId)
  const positions = db.prepare('SELECT * FROM quant_positions WHERE user_id = ? AND status = ?').all(userId, 'open')
  
  const checks = []
  const errors = []
  const warnings = []
  
  // 1. 检查总资金是否足够
  const orderValue = order.price * order.quantity
  if (orderValue > config.available_capital) {
    errors.push({
      rule: 'insufficient_capital',
      message: `订单价值 ¥${orderValue.toLocaleString()} 超过可用资金 ¥${config.available_capital.toLocaleString()}`,
      severity: 'breach',
      action: 'reject'
    })
  }
  
  // 2. 检查单笔仓位限制
  const maxSingleRule = rules.find(r => r.rule_type === 'max_single_position')
  if (maxSingleRule) {
    const maxSingleValue = config.total_capital * maxSingleRule.threshold
    if (orderValue > maxSingleValue) {
      errors.push({
        rule: 'max_single_position',
        message: `单笔订单 ¥${orderValue.toLocaleString()} 超过限制 ¥${maxSingleValue.toLocaleString()} (${(maxSingleRule.threshold * 100).toFixed(0)}% of total)`,
        severity: maxSingleRule.severity,
        action: maxSingleRule.action,
        threshold: maxSingleRule.threshold,
        current: orderValue / config.total_capital
      })
    }
  }
  
  // 3. 检查总敞口限制
  const maxExposureRule = rules.find(r => r.rule_type === 'max_total_exposure')
  if (maxExposureRule) {
    const currentExposure = positions.reduce((sum, p) => sum + p.quantity * p.current_price, 0)
    const newExposure = currentExposure + orderValue
    const maxExposure = config.total_capital * maxExposureRule.threshold
    if (newExposure > maxExposure) {
      errors.push({
        rule: 'max_total_exposure',
        message: `总敞口 ¥${newExposure.toLocaleString()} 将超过限制 ¥${maxExposure.toLocaleString()} (${(maxExposureRule.threshold * 100).toFixed(0)}%)`,
        severity: maxExposureRule.severity,
        action: maxExposureRule.action,
        threshold: maxExposureRule.threshold,
        current: newExposure / config.total_capital
      })
    }
  }
  
  // 4. 检查模型集中度
  const concentrationRule = rules.find(r => r.rule_type === 'model_concentration')
  if (concentrationRule) {
    const modelPositions = positions.filter(p => p.model_code === order.model_code)
    const modelExposure = modelPositions.reduce((sum, p) => sum + p.quantity * p.current_price, 0)
    const newModelExposure = modelExposure + orderValue
    const maxConcentration = config.total_capital * concentrationRule.threshold
    if (newModelExposure > maxConcentration) {
      warnings.push({
        rule: 'model_concentration',
        message: `${order.model_code} 持仓集中度将达到 ${((newModelExposure / config.total_capital) * 100).toFixed(1)}%，超过阈值 ${(concentrationRule.threshold * 100).toFixed(0)}%`,
        severity: concentrationRule.severity,
        action: concentrationRule.action
      })
    }
  }
  
  // 5. 检查杠杆限制
  const leverageRule = rules.find(r => r.rule_type === 'max_leverage')
  if (leverageRule && order.leverage > leverageRule.threshold) {
    errors.push({
      rule: 'max_leverage',
      message: `杠杆 ${order.leverage}x 超过限制 ${leverageRule.threshold}x`,
      severity: leverageRule.severity,
      action: leverageRule.action
    })
  }
  
  return {
    passed: errors.length === 0,
    errors,
    warnings,
    checks
  }
}

// ============ 事中风控：实时风险评估 ============
export function assessRisk(userId) {
  const config = getRiskConfig(userId)
  const rules = getRiskRules(userId)
  const positions = db.prepare('SELECT * FROM quant_positions WHERE user_id = ? AND status = ?').all(userId, 'open')
  
  const alerts = []
  const metrics = {}
  
  // 计算总敞口
  let totalExposure = 0
  let totalUnrealizedPnL = 0
  let totalMargin = 0
  const modelExposures = {}
  
  for (const pos of positions) {
    const quote = getMarketQuote(pos.model_code, pos.region)
    const currentPrice = quote ? quote.price : pos.current_price
    const positionValue = pos.quantity * currentPrice
    const unrealizedPnL = (currentPrice - pos.avg_price) * pos.quantity * (pos.side === 'long' ? 1 : -1)
    
    totalExposure += positionValue
    totalUnrealizedPnL += unrealizedPnL
    totalMargin += pos.margin
    
    modelExposures[pos.model_code] = (modelExposures[pos.model_code] || 0) + positionValue
    
    // 更新持仓当前价格和浮盈
    db.prepare(`
      UPDATE quant_positions SET current_price = ?, unrealized_pnl = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(currentPrice, unrealizedPnL, pos.id)
  }
  
  metrics.total_exposure = totalExposure
  metrics.total_unrealized_pnl = totalUnrealizedPnL
  metrics.total_margin = totalMargin
  metrics.available_capital = config.available_capital
  metrics.total_capital = config.total_capital
  metrics.net_value = config.total_capital + totalUnrealizedPnL
  metrics.exposure_ratio = config.total_capital > 0 ? totalExposure / config.total_capital : 0
  metrics.pnl_ratio = config.total_capital > 0 ? totalUnrealizedPnL / config.total_capital : 0
  
  // 检查各项风控规则
  for (const rule of rules) {
    let currentValue = 0
    let triggered = false
    
    switch (rule.rule_type) {
      case 'max_single_position': {
        const maxPos = Math.max(...Object.values(modelExposures), 0)
        currentValue = config.total_capital > 0 ? maxPos / config.total_capital : 0
        triggered = currentValue > rule.threshold
        break
      }
      case 'max_total_exposure': {
        currentValue = metrics.exposure_ratio
        triggered = currentValue > rule.threshold
        break
      }
      case 'daily_loss_limit': {
        // 获取今日已实现亏损
        const todayTrades = db.prepare(`
          SELECT COALESCE(SUM(pnl), 0) as total_pnl FROM quant_trades 
          WHERE user_id = ? AND date(created_at) = date('now', 'localtime')
        `).get(userId)
        const dailyPnL = todayTrades.total_pnl + totalUnrealizedPnL
        currentValue = config.total_capital > 0 ? Math.abs(Math.min(0, dailyPnL)) / config.total_capital : 0
        triggered = currentValue > rule.threshold
        break
      }
      case 'max_drawdown': {
        // 简化：用浮亏作为回撤代理
        currentValue = config.total_capital > 0 ? Math.abs(Math.min(0, totalUnrealizedPnL)) / config.total_capital : 0
        triggered = currentValue > rule.threshold
        break
      }
      case 'model_concentration': {
        const maxConc = Math.max(...Object.values(modelExposures).map(v => config.total_capital > 0 ? v / config.total_capital : 0), 0)
        currentValue = maxConc
        triggered = currentValue > rule.threshold
        break
      }
      case 'margin_call': {
        currentValue = totalMargin > 0 ? (totalMargin - config.available_capital) / totalMargin : 0
        triggered = config.available_capital < totalMargin * (1 - rule.threshold)
        break
      }
      case 'forced_liquidation': {
        currentValue = totalMargin > 0 ? Math.abs(totalUnrealizedPnL) / totalMargin : 0
        triggered = currentValue > rule.threshold
        break
      }
      case 'circuit_breaker': {
        // 当日亏损超过阈值触发熔断
        const todayTrades = db.prepare(`
          SELECT COALESCE(SUM(pnl), 0) as total_pnl FROM quant_trades 
          WHERE user_id = ? AND date(created_at) = date('now', 'localtime')
        `).get(userId)
        const dailyPnL = todayTrades.total_pnl + totalUnrealizedPnL
        currentValue = config.total_capital > 0 ? Math.abs(Math.min(0, dailyPnL)) / config.total_capital : 0
        triggered = currentValue > rule.threshold
        break
      }
      case 'overnight_limit': {
        const overnightExposure = positions.reduce((sum, p) => sum + p.quantity * p.current_price, 0)
        currentValue = config.total_capital > 0 ? overnightExposure / config.total_capital : 0
        triggered = currentValue > rule.threshold
        break
      }
      default:
        continue
    }
    
    // 更新规则当前值
    db.prepare(`
      UPDATE quant_risk_rules SET current_value = ?, triggered_at = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(currentValue, triggered ? new Date().toISOString() : null, rule.id)
    
    if (triggered) {
      const alert = {
        id: uuidv4(),
        user_id: userId,
        alert_type: rule.rule_type,
        severity: rule.severity,
        title: getAlertTitle(rule.rule_type),
        message: getAlertMessage(rule.rule_type, currentValue, rule.threshold),
        data: JSON.stringify({ current: currentValue, threshold: rule.threshold, action: rule.action }),
        created_at: new Date().toISOString()
      }
      
      db.prepare(`
        INSERT INTO quant_risk_alerts (id, user_id, alert_type, severity, title, message, data)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(alert.id, alert.user_id, alert.alert_type, alert.severity, alert.title, alert.message, alert.data)
      
      alerts.push(alert)
    }
  }
  
  // 计算风险评分 (0-100, 越高越危险)
  let riskScore = 0
  if (metrics.exposure_ratio > 0.5) riskScore += 20
  if (metrics.exposure_ratio > 0.8) riskScore += 20
  if (metrics.pnl_ratio < -0.03) riskScore += 15
  if (metrics.pnl_ratio < -0.05) riskScore += 15
  if (metrics.pnl_ratio < -0.10) riskScore += 30
  if (alerts.filter(a => a.severity === 'critical').length > 0) riskScore += 20
  if (alerts.filter(a => a.severity === 'breach').length > 0) riskScore += 30
  
  metrics.risk_score = Math.min(100, riskScore)
  metrics.risk_level = 
    riskScore >= 80 ? 'extreme' :
    riskScore >= 60 ? 'high' :
    riskScore >= 40 ? 'moderate' :
    riskScore >= 20 ? 'low' : 'safe'
  
  return {
    metrics,
    alerts,
    positions: positions.map(p => {
      const quote = getMarketQuote(p.model_code, p.region)
      return {
        ...p,
        current_price: quote ? quote.price : p.current_price,
        unrealized_pnl: quote ? (quote.price - p.avg_price) * p.quantity * (p.side === 'long' ? 1 : -1) : p.unrealized_pnl
      }
    })
  }
}

// ============ 获取风控告警 ============
export function getRiskAlerts(userId, options = {}) {
  const { acknowledged, limit = 50 } = options
  let query = 'SELECT * FROM quant_risk_alerts WHERE user_id = ?'
  const params = [userId]
  
  if (acknowledged !== undefined) {
    query += ' AND acknowledged = ?'
    params.push(acknowledged ? 1 : 0)
  }
  
  query += ' ORDER BY created_at DESC LIMIT ?'
  params.push(limit)
  
  return db.prepare(query).all(...params)
}

// ============ 确认告警 ============
export function acknowledgeAlert(alertId, userId) {
  db.prepare(`
    UPDATE quant_risk_alerts SET acknowledged = 1, acknowledged_at = datetime('now', 'localtime')
    WHERE id = ? AND user_id = ?
  `).run(alertId, userId)
  return { success: true }
}

// ============ 获取风控仪表盘数据 ============
export function getRiskDashboard(userId) {
  const config = getRiskConfig(userId)
  const rules = getRiskRules(userId)
  const assessment = assessRisk(userId)
  const recentAlerts = getRiskAlerts(userId, { limit: 10 })
  
  // 按严重程度统计告警
  const alertStats = {
    info: recentAlerts.filter(a => a.severity === 'info' && !a.acknowledged).length,
    warning: recentAlerts.filter(a => a.severity === 'warning' && !a.acknowledged).length,
    critical: recentAlerts.filter(a => a.severity === 'critical' && !a.acknowledged).length,
    breach: recentAlerts.filter(a => a.severity === 'breach' && !a.acknowledged).length
  }
  
  // 规则状态
  const ruleStatus = rules.map(r => ({
    ...r,
    utilization: r.threshold > 0 ? (r.current_value / r.threshold) : 0,
    status: r.current_value > r.threshold ? 'breached' :
            r.current_value > r.threshold * 0.8 ? 'warning' : 'normal'
  }))
  
  return {
    config,
    metrics: assessment.metrics,
    alerts: recentAlerts,
    alert_stats: alertStats,
    rules: ruleStatus,
    positions: assessment.positions,
    risk_score: assessment.metrics.risk_score,
    risk_level: assessment.metrics.risk_level
  }
}

// ============ 辅助函数 ============
function getAlertTitle(ruleType) {
  const titles = {
    max_single_position: '单笔仓位超限',
    max_total_exposure: '总敞口超限',
    daily_loss_limit: '日内亏损超限',
    max_drawdown: '最大回撤超限',
    max_leverage: '杠杆超限',
    model_concentration: '模型集中度过高',
    margin_call: '保证金不足',
    forced_liquidation: '强制平仓预警',
    circuit_breaker: '熔断触发',
    overnight_limit: '隔夜持仓超限'
  }
  return titles[ruleType] || ruleType
}

function getAlertMessage(ruleType, current, threshold) {
  const pct = (v) => (v * 100).toFixed(1) + '%'
  const messages = {
    max_single_position: `单笔仓位占比 ${pct(current)} 超过阈值 ${pct(threshold)}，建议减仓`,
    max_total_exposure: `总敞口占比 ${pct(current)} 超过阈值 ${pct(threshold)}，建议降低仓位`,
    daily_loss_limit: `日内亏损 ${pct(current)} 超过限制 ${pct(threshold)}，已触发暂停交易`,
    max_drawdown: `回撤 ${pct(current)} 超过限制 ${pct(threshold)}，建议止损`,
    max_leverage: `杠杆 ${current}x 超过限制 ${threshold}x`,
    model_concentration: `单一模型集中度 ${pct(current)} 超过阈值 ${pct(threshold)}`,
    margin_call: `保证金不足，可用资金低于维持保证金要求`,
    forced_liquidation: `浮亏占保证金 ${pct(current)} 超过阈值 ${pct(threshold)}，面临强制平仓`,
    circuit_breaker: `日内亏损触发熔断 ${pct(current)}，所有新交易已暂停`,
    overnight_limit: `隔夜持仓 ${pct(current)} 超过限制 ${pct(threshold)}`
  }
  return messages[ruleType] || `${ruleType}: ${pct(current)} / ${pct(threshold)}`
}
