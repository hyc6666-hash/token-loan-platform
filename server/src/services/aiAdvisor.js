/**
 * AI 策略顾问
 * 
 * 根据用户资金体量、风险偏好，智能推荐策略组合和风控体系
 * 
 * 资金分级：
 * - micro: < 10万（小资金试水）
 * - small: 10-50万（中等规模）
 * - medium: 50-200万（较大规模）
 * - large: 200万+（大资金）
 */

import { STRATEGY_TYPES, getStrategyTypes } from './strategyEngine.js'
import { getRiskConfig } from './riskEngine.js'

// ============ 资金分级 ============
const CAPITAL_TIERS = {
  micro: {
    label: '微型资金',
    range: [0, 100000],
    description: '10万以内，主要验证策略有效性',
    recommended_strategies: ['trend_following', 'mean_reversion'],
    risk_profile: {
      risk_tolerance: 'conservative',
      max_single_position: 0.15,
      max_total_exposure: 0.60,
      daily_loss_limit: 0.03,
      max_drawdown: 0.08
    },
    allocation: {
      trend_following: 0.50,
      mean_reversion: 0.30,
      reserve: 0.20
    }
  },
  small: {
    label: '小型资金',
    range: [100000, 500000],
    description: '10-50万，需要较完善的风控',
    recommended_strategies: ['cross_model_arb', 'time_region_arb', 'trend_following'],
    risk_profile: {
      risk_tolerance: 'moderate',
      max_single_position: 0.10,
      max_total_exposure: 0.70,
      daily_loss_limit: 0.04,
      max_drawdown: 0.12
    },
    allocation: {
      cross_model_arb: 0.30,
      time_region_arb: 0.25,
      trend_following: 0.25,
      reserve: 0.20
    }
  },
  medium: {
    label: '中型资金',
    range: [500000, 2000000],
    description: '50-200万，需要多策略分散和严格风控',
    recommended_strategies: ['cross_model_arb', 'time_region_arb', 'trend_following', 'market_making', 'forward_spot_arb'],
    risk_profile: {
      risk_tolerance: 'moderate',
      max_single_position: 0.08,
      max_total_exposure: 0.75,
      daily_loss_limit: 0.04,
      max_drawdown: 0.10
    },
    allocation: {
      cross_model_arb: 0.20,
      time_region_arb: 0.20,
      trend_following: 0.15,
      market_making: 0.15,
      forward_spot_arb: 0.10,
      reserve: 0.20
    }
  },
  large: {
    label: '大型资金',
    range: [2000000, Infinity],
    description: '200万以上，需要机构级风控和合规',
    recommended_strategies: ['cross_model_arb', 'time_region_arb', 'trend_following', 'mean_reversion', 'market_making', 'forward_spot_arb'],
    risk_profile: {
      risk_tolerance: 'conservative',
      max_single_position: 0.05,
      max_total_exposure: 0.65,
      daily_loss_limit: 0.03,
      max_drawdown: 0.08
    },
    allocation: {
      cross_model_arb: 0.15,
      time_region_arb: 0.15,
      trend_following: 0.10,
      mean_reversion: 0.10,
      market_making: 0.20,
      forward_spot_arb: 0.10,
      reserve: 0.20
    }
  }
}

// ============ 获取资金分级 ============
export function getCapitalTier(capital) {
  for (const [key, tier] of Object.entries(CAPITAL_TIERS)) {
    if (capital >= tier.range[0] && capital < tier.range[1]) {
      return { key, ...tier }
    }
  }
  return { key: 'micro', ...CAPITAL_TIERS.micro }
}

// ============ AI 策略推荐 ============
export function recommendStrategy(userId, capital, riskPreference) {
  const tier = getCapitalTier(capital)
  
  // 根据风险偏好调整
  const riskAdjustments = {
    conservative: { exposure: -0.10, loss: -0.01, drawdown: -0.02 },
    moderate: { exposure: 0, loss: 0, drawdown: 0 },
    aggressive: { exposure: 0.10, loss: 0.01, drawdown: 0.03 },
    extreme: { exposure: 0.15, loss: 0.02, drawdown: 0.05 }
  }
  
  const pref = riskPreference || tier.risk_profile.risk_tolerance
  const adj = riskAdjustments[pref] || riskAdjustments.moderate
  
  const adjustedRisk = {
    ...tier.risk_profile,
    risk_tolerance: pref,
    max_total_exposure: Math.min(0.95, tier.risk_profile.max_total_exposure + adj.exposure),
    daily_loss_limit: Math.min(0.10, tier.risk_profile.daily_loss_limit + adj.loss),
    max_drawdown: Math.min(0.20, tier.risk_profile.max_drawdown + adj.drawdown)
  }
  
  // 生成策略推荐
  const strategies = tier.recommended_strategies.map(type => {
    const strategyDef = STRATEGY_TYPES[type]
    if (!strategyDef) return null
    
    const allocation = tier.allocation[type] || 0
    const allocatedCapital = Math.round(capital * allocation)
    
    return {
      type,
      name: strategyDef.name,
      description: strategyDef.description,
      risk_level: strategyDef.risk_level,
      expected_return: strategyDef.expected_return,
      allocated_capital: allocatedCapital,
      allocation_pct: allocation,
      params: Object.entries(strategyDef.params).reduce((acc, [k, v]) => {
        acc[k] = v.default
        return acc
      }, {}),
      ai_reasoning: generateReasoning(type, capital, pref, allocatedCapital)
    }
  }).filter(Boolean)
  
  // 生成风控建议
  const riskControl = {
    ...adjustedRisk,
    rules: generateRiskRules(adjustedRisk, capital),
    monitoring: [
      '实时监控持仓浮盈/浮亏',
      '每5分钟评估风险指标',
      '触发告警自动通知',
      '日内亏损超限自动暂停',
      '保证金不足自动减仓',
      '强制平仓线自动触发'
    ],
    emergency_protocols: [
      { trigger: '日内亏损 > 3%', action: '减仓50%', priority: 'high' },
      { trigger: '日内亏损 > 5%', action: '暂停所有新交易', priority: 'critical' },
      { trigger: '总回撤 > 8%', action: '全面止损', priority: 'critical' },
      { trigger: '保证金不足', action: '追加保证金或减仓', priority: 'high' },
      { trigger: '浮亏 > 保证金15%', action: '强制平仓', priority: 'breach' }
    ]
  }
  
  // 生成整体分析
  const analysis = {
    capital_tier: tier.key,
    tier_label: tier.label,
    tier_description: tier.description,
    total_capital: capital,
    risk_preference: pref,
    recommended_strategies: strategies,
    risk_control: riskControl,
    expected_annual_return: calculateExpectedReturn(strategies),
    max_estimated_loss: capital * adjustedRisk.max_drawdown,
    sharpe_estimate: estimateSharpe(strategies, pref),
    summary: generateSummary(tier, pref, capital, strategies)
  }
  
  return analysis
}

// ============ 生成策略推荐理由 ============
function generateReasoning(strategyType, capital, riskPref, allocatedCapital) {
  const reasons = {
    cross_model_arb: `资金 ¥${capital.toLocaleString()} 足够分散到4个模型对冲，分配 ¥${allocatedCapital.toLocaleString()}。跨模型套利风险低，适合${riskPref === 'conservative' ? '保守' : '稳健'}型投资者。GLM-5.2与DeepSeek-V4价差波动提供稳定套利空间。`,
    time_region_arb: `6大区域峰谷价差平均15-30%，分配 ¥${allocatedCapital.toLocaleString()}。时区套利几乎无方向性风险，适合${riskPref}型。CN1区域低谷价格最低，US1高峰价格最高。`,
    trend_following: `RSI+MACD双指标系统，分配 ¥${allocatedCapital.toLocaleString()}。趋势跟踪需要较强风控，建议止损5%止盈10%。适合${riskPref === 'aggressive' ? '激进' : '稳健'}型投资者。`,
    mean_reversion: `布林带回归策略，分配 ¥${allocatedCapital.toLocaleString()}。容量价格均值回归特性明显，适合震荡市场。`,
    market_making: `C2C市场做市，分配 ¥${allocatedCapital.toLocaleString()}。需要较大资金提供流动性，价差收益稳定但需要管理库存风险。适合${capital >= 1000000 ? '大资金' : '中等资金'}。`,
    forward_spot_arb: `远期合约基差套利，分配 ¥${allocatedCapital.toLocaleString()}。远期升水2-5%提供低风险套利机会，需要持有到期。`
  }
  return reasons[strategyType] || '基于资金规模和风险偏好推荐'
}

// ============ 生成风控规则 ============
function generateRiskRules(riskProfile, capital) {
  return [
    {
      rule_type: 'max_single_position',
      threshold: riskProfile.max_single_position,
      description: `单笔订单不超过总资金 ${(riskProfile.max_single_position * 100).toFixed(0)}% = ¥${(capital * riskProfile.max_single_position).toLocaleString()}`,
      severity: 'warning',
      action: 'alert'
    },
    {
      rule_type: 'max_total_exposure',
      threshold: riskProfile.max_total_exposure,
      description: `总敞口不超过 ${(riskProfile.max_total_exposure * 100).toFixed(0)}% = ¥${(capital * riskProfile.max_total_exposure).toLocaleString()}`,
      severity: 'warning',
      action: 'reduce'
    },
    {
      rule_type: 'daily_loss_limit',
      threshold: riskProfile.daily_loss_limit,
      description: `日内亏损不超过 ${(riskProfile.daily_loss_limit * 100).toFixed(1)}% = ¥${(capital * riskProfile.daily_loss_limit).toLocaleString()}`,
      severity: 'critical',
      action: 'halt'
    },
    {
      rule_type: 'max_drawdown',
      threshold: riskProfile.max_drawdown,
      description: `最大回撤不超过 ${(riskProfile.max_drawdown * 100).toFixed(0)}% = ¥${(capital * riskProfile.max_drawdown).toLocaleString()}`,
      severity: 'critical',
      action: 'halt'
    },
    {
      rule_type: 'model_concentration',
      threshold: 0.35,
      description: `单一模型持仓不超过 35% = ¥${(capital * 0.35).toLocaleString()}`,
      severity: 'warning',
      action: 'alert'
    },
    {
      rule_type: 'max_leverage',
      threshold: 2.0,
      description: `最大杠杆 2.0x`,
      severity: 'critical',
      action: 'liquidate'
    },
    {
      rule_type: 'circuit_breaker',
      threshold: riskProfile.daily_loss_limit,
      description: `日内亏损触发熔断，暂停所有新交易`,
      severity: 'critical',
      action: 'halt'
    },
    {
      rule_type: 'forced_liquidation',
      threshold: 0.15,
      description: `浮亏占保证金超过 15% 强制平仓`,
      severity: 'breach',
      action: 'liquidate'
    }
  ]
}

// ============ 计算预期收益 ============
function calculateExpectedReturn(strategies) {
  let weightedReturn = 0
  let totalAllocation = 0
  
  for (const s of strategies) {
    const returnRange = s.expected_return.match(/(\d+)-(\d+)/)
    if (returnRange) {
      const avgReturn = (parseInt(returnRange[1]) + parseInt(returnRange[2])) / 2
      weightedReturn += avgReturn * s.allocation_pct
      totalAllocation += s.allocation_pct
    }
  }
  
  return {
    annual_return_pct: weightedReturn.toFixed(1) + '%',
    annual_return_amount: Math.round(strategies.reduce((sum, s) => sum + s.allocated_capital, 0) * weightedReturn / 100),
    allocation_used: totalAllocation
  }
}

// ============ 估算夏普比率 ============
function estimateSharpe(strategies, riskPref) {
  const baseSharpe = {
    conservative: 1.5,
    moderate: 1.2,
    aggressive: 0.9,
    extreme: 0.7
  }
  return baseSharpe[riskPref] || 1.2
}

// ============ 生成总结 ============
function generateSummary(tier, riskPref, capital, strategies) {
  const strategyNames = strategies.map(s => s.name).join('、')
  return `基于您的资金体量 ¥${capital.toLocaleString()}（${tier.label}）和${riskPref === 'conservative' ? '保守' : riskPref === 'moderate' ? '稳健' : riskPref === 'aggressive' ? '激进' : '极端'}型风险偏好，AI推荐${strategies.length}个策略组合：${strategyNames}。风控体系以日内亏损${(tier.risk_profile.daily_loss_limit * 100).toFixed(0)}%为熔断线，最大回撤${(tier.risk_profile.max_drawdown * 100).toFixed(0)}%为止损线，确保资金安全。`
}

// ============ 获取所有资金分级 ============
export function getAllTiers() {
  return Object.entries(CAPITAL_TIERS).map(([key, tier]) => ({
    key,
    ...tier,
    range_label: tier.range[1] === Infinity 
      ? `${tier.range[0] / 10000}万以上` 
      : `${tier.range[0] / 10000}-${tier.range[1] / 10000}万`
  }))
}
