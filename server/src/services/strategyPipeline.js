/**
 * 策略 Pipeline 编排器
 *
 * 四阶段量化交易流程：
 * 1. 策略设计 — 将投资想法转化为量化模型
 * 2. 验证优化 — 历史数据回测
 * 3. 模拟测试 — 纸面交易
 * 4. 实盘部署 — 渐进式上线与持续迭代
 *
 * 全程由 AI 接管，支持接入不同模型进行分析
 */

import { v4 as uuidv4 } from 'uuid'
import db from '../database/quant-init.js'
import { runBacktest, getBacktestResult, STRATEGY_TYPES } from './backtestEngine.js'
import { initPaperTrading, getPaperTradingState, autoRunPaperTrading, stopPaperTrading } from './paperTrading.js'
import { callAIModel, getDefaultModel, SYSTEM_PROMPTS } from './aiModelRouter.js'
import { scrapeKaiMarket } from './kaiScraper.js'
import { getCandles, calculateIndicators, getModels } from './marketData.js'

// ============ 创建 Pipeline ============
export function createPipeline(userId, data) {
  const id = uuidv4()
  const {
    strategy_name,
    strategy_type = 'trend_following',
    hypothesis = '',
    model_code = 'GLM-5.2',
    region = 'SG1',
    timeframe = '1h',
    initial_capital = 1000000,
    parameters = {},
    ai_model_id = null
  } = data

  const config = JSON.stringify({ model_code, region, timeframe, initial_capital, parameters })

  db.prepare(`
    INSERT INTO quant_pipeline_stages (
      id, user_id, strategy_name, strategy_type, hypothesis, config,
      current_stage, stage_status, ai_model_id, capital_allocation
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, strategy_name, strategy_type, hypothesis, config, 'design', 'in_progress', ai_model_id, initial_capital)

  return getPipeline(id, userId)
}

// ============ 获取 Pipeline ============
export function getPipeline(pipelineId, userId) {
  const pipeline = db.prepare('SELECT * FROM quant_pipeline_stages WHERE id = ? AND user_id = ?').get(pipelineId, userId)
  if (!pipeline) return null

  return {
    ...pipeline,
    config: typeof pipeline.config === 'string' ? JSON.parse(pipeline.config) : pipeline.config,
    design_data: pipeline.design_data ? (typeof pipeline.design_data === 'string' ? JSON.parse(pipeline.design_data) : pipeline.design_data) : null,
    backtest_data: pipeline.backtest_data ? (typeof pipeline.backtest_data === 'string' ? JSON.parse(pipeline.backtest_data) : pipeline.backtest_data) : null,
    paper_data: pipeline.paper_data ? (typeof pipeline.paper_data === 'string' ? JSON.parse(pipeline.paper_data) : pipeline.paper_data) : null,
    live_data: pipeline.live_data ? (typeof pipeline.live_data === 'string' ? JSON.parse(pipeline.live_data) : pipeline.live_data) : null,
    ai_analysis: pipeline.ai_analysis ? (typeof pipeline.ai_analysis === 'string' ? JSON.parse(pipeline.ai_analysis) : pipeline.ai_analysis) : null,
    monitoring_data: pipeline.monitoring_data ? (typeof pipeline.monitoring_data === 'string' ? JSON.parse(pipeline.monitoring_data) : pipeline.monitoring_data) : null
  }
}

// ============ 列出 Pipelines ============
export function listPipelines(userId, limit = 20) {
  return db.prepare('SELECT id, strategy_name, strategy_type, current_stage, stage_status, capital_allocation, live_capital_percent, created_at, updated_at FROM quant_pipeline_stages WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit)
}

// ============ 阶段1: AI 辅助策略设计 ============
export async function stage1Design(userId, pipelineId, options = {}) {
  const pipeline = getPipeline(pipelineId, userId)
  if (!pipeline) throw new Error('Pipeline 不存在')

  const { ai_model_id, market_context, user_idea } = options

  // 获取市场数据上下文
  let marketData = null
  try {
    marketData = await scrapeKaiMarket()
  } catch { /* ignore */ }

  const models = getModels()
  const candles = getCandles(pipeline.config.model_code, pipeline.config.region, '1h', 50)
  const indicators = calculateIndicators(candles)

  const userPrompt = JSON.stringify({
    user_idea: user_idea || pipeline.hypothesis || '设计一个量化交易策略',
    strategy_type: pipeline.strategy_type,
    strategy_type_description: STRATEGY_TYPES[pipeline.strategy_type]?.description,
    target_model: pipeline.config.model_code,
    region: pipeline.config.region,
    initial_capital: pipeline.config.initial_capital,
    market_data: {
      latest_price: marketData?.latestPrice,
      spread: marketData?.spread,
      order_book: marketData?.orderBook ? {
        bid_volume: marketData.orderBook.bids?.length || 0,
        ask_volume: marketData.orderBook.asks?.length || 0
      } : null
    },
    technical_indicators: {
      rsi: indicators.rsi,
      macd: indicators.macd,
      macd_signal: indicators.macd_signal,
      ma: indicators.ma,
      bollinger: indicators.bollinger
    },
    available_models: models.map(m => ({ code: m.code, name: m.name, base_price: m.base_price }))
  }, null, 2)

  // 调用 AI 模型
  const aiResult = await callAIModel(
    ai_model_id || pipeline.ai_model_id,
    userId,
    SYSTEM_PROMPTS.strategy_design,
    userPrompt,
    { timeout: 30000 }
  )

  const designData = {
    ai_result: aiResult,
    market_context: marketData ? {
      latest_price: marketData.latestPrice,
      spread: marketData.spread,
      source: marketData.source,
      timestamp: marketData.timestamp
    } : null,
    indicators: {
      rsi: indicators.rsi,
      macd: indicators.macd,
      ma: indicators.ma
    },
    timestamp: new Date().toISOString()
  }

  // 更新 Pipeline
  db.prepare(`
    UPDATE quant_pipeline_stages
    SET design_data = ?, current_stage = 'design', stage_status = ?,
        ai_analysis = ?, updated_at = datetime('now', 'localtime')
    WHERE id = ? AND user_id = ?
  `).run(
    JSON.stringify(designData),
    aiResult.success ? 'passed' : 'failed',
    JSON.stringify(aiResult),
    pipelineId, userId
  )

  return {
    pipeline: getPipeline(pipelineId, userId),
    design: designData
  }
}

// ============ 阶段2: 回测验证 ============
export async function stage2Backtest(userId, pipelineId, options = {}) {
  const pipeline = getPipeline(pipelineId, userId)
  if (!pipeline) throw new Error('Pipeline 不存在')

  const {
    start_date = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date = new Date().toISOString().split('T')[0],
    timeframe = pipeline.config.timeframe || '1h',
    parameters = pipeline.config.parameters || {},
    costs = {},
    ai_model_id
  } = options

  // 运行回测
  const backtestResult = await runBacktest(userId, {
    strategy_id: pipelineId,
    strategy_name: pipeline.strategy_name,
    strategy_type: pipeline.strategy_type,
    model_code: pipeline.config.model_code,
    region: pipeline.config.region,
    timeframe,
    initial_capital: pipeline.config.initial_capital,
    start_date,
    end_date,
    parameters,
    costs,
    ai_model_id: ai_model_id || pipeline.ai_model_id
  })

  // AI 分析回测结果
  const aiAnalysis = await callAIModel(
    ai_model_id || pipeline.ai_model_id,
    userId,
    SYSTEM_PROMPTS.backtest_analysis,
    JSON.stringify({
      strategy_name: pipeline.strategy_name,
      strategy_type: pipeline.strategy_type,
      metrics: {
        total_return: backtestResult.total_return,
        annualized_return: backtestResult.annualized_return,
        max_drawdown: backtestResult.max_drawdown,
        sharpe_ratio: backtestResult.sharpe_ratio,
        win_rate: backtestResult.win_rate,
        profit_loss_ratio: backtestResult.profit_loss_ratio,
        total_trades: backtestResult.total_trades,
        winning_trades: backtestResult.winning_trades,
        losing_trades: backtestResult.losing_trades,
        avg_win: backtestResult.avg_win,
        avg_loss: backtestResult.avg_loss,
        avg_holding_period: backtestResult.avg_holding_period
      },
      market_environments: backtestResult.market_environments,
      trade_count: backtestResult.trade_history?.length || 0
    }, null, 2),
    { timeout: 30000 }
  )

  // 判断是否通过
  const passed = backtestResult.total_return > 0 &&
                  backtestResult.max_drawdown < 0.2 &&
                  backtestResult.sharpe_ratio > 0.5

  db.prepare(`
    UPDATE quant_pipeline_stages
    SET backtest_data = ?, current_stage = 'backtest',
        stage_status = ?,
        updated_at = datetime('now', 'localtime')
    WHERE id = ? AND user_id = ?
  `).run(
    JSON.stringify({
      backtest_id: backtestResult.id,
      backtest_result: {
        total_return: backtestResult.total_return,
        annualized_return: backtestResult.annualized_return,
        max_drawdown: backtestResult.max_drawdown,
        sharpe_ratio: backtestResult.sharpe_ratio,
        win_rate: backtestResult.win_rate,
        profit_loss_ratio: backtestResult.profit_loss_ratio,
        total_trades: backtestResult.total_trades
      },
      ai_analysis: aiAnalysis,
      timestamp: new Date().toISOString()
    }),
    passed ? 'passed' : 'failed',
    pipelineId, userId
  )

  return {
    pipeline: getPipeline(pipelineId, userId),
    backtest: backtestResult,
    ai_analysis: aiAnalysis,
    passed
  }
}

// ============ 阶段3: 模拟交易 ============
export async function stage3PaperTrading(userId, pipelineId, options = {}) {
  const pipeline = getPipeline(pipelineId, userId)
  if (!pipeline) throw new Error('Pipeline 不存在')

  const {
    latency_ms = 100,
    slippage_bps = 3,
    duration_minutes = 30,
    ai_model_id
  } = options

  const backtestData = pipeline.backtest_data
  const backtestId = backtestData?.backtest_id

  // 初始化模拟交易
  const paperState = initPaperTrading(userId, {
    initial_capital: pipeline.config.initial_capital,
    backtest_id: backtestId,
    strategy_id: pipelineId,
    strategy_type: pipeline.strategy_type,
    model_code: pipeline.config.model_code,
    region: pipeline.config.region,
    latency_ms,
    slippage_bps,
    fee_rate: 0.001
  })

  // 自动运行若干轮模拟交易
  const tradeResults = []
  const rounds = Math.min(10, duration_minutes)
  for (let i = 0; i < rounds; i++) {
    const result = await autoRunPaperTrading(userId)
    if (result?.trade) {
      tradeResults.push(result.trade)
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  const finalState = getPaperTradingState(userId)
  const summary = stopPaperTrading(userId)

  // AI 评审模拟交易
  const aiReview = await callAIModel(
    ai_model_id || pipeline.ai_model_id,
    userId,
    SYSTEM_PROMPTS.paper_trading_review,
    JSON.stringify({
      strategy_name: pipeline.strategy_name,
      paper_trading_summary: summary,
      backtest_comparison: {
        backtest_return: backtestData?.backtest_result?.total_return,
        paper_return: summary?.total_return,
        match_rate: summary?.match_rate
      },
      trade_count: tradeResults.length,
      latency_ms,
      slippage_bps
    }, null, 2),
    { timeout: 30000 }
  )

  // 判断是否通过（匹配度 > 80%）
  const passed = summary && summary.match_rate >= 0.8 && summary.total_return > -0.05

  db.prepare(`
    UPDATE quant_pipeline_stages
    SET paper_data = ?, current_stage = 'paper',
        stage_status = ?,
        updated_at = datetime('now', 'localtime')
    WHERE id = ? AND user_id = ?
  `).run(
    JSON.stringify({
      summary,
      trades: tradeResults,
      ai_review: aiReview,
      config: { latency_ms, slippage_bps, duration_minutes },
      timestamp: new Date().toISOString()
    }),
    passed ? 'passed' : 'failed',
    pipelineId, userId
  )

  return {
    pipeline: getPipeline(pipelineId, userId),
    paper_summary: summary,
    ai_review: aiReview,
    passed
  }
}

// ============ 阶段4: 实盘部署 ============
export async function stage4LiveDeployment(userId, pipelineId, options = {}) {
  const pipeline = getPipeline(pipelineId, userId)
  if (!pipeline) throw new Error('Pipeline 不存在')

  const {
    initial_percent = 0.01,  // 先以 1% 资金
    target_percent = 0.10,   // 目标 10%
    ai_model_id
  } = options

  const liveCapital = pipeline.capital_allocation * initial_percent

  // AI 实盘监控分析
  let marketData = null
  try {
    marketData = await scrapeKaiMarket()
  } catch { /* ignore */ }

  const candles = getCandles(pipeline.config.model_code, pipeline.config.region, '1h', 50)
  const indicators = calculateIndicators(candles)

  const aiMonitoring = await callAIModel(
    ai_model_id || pipeline.ai_model_id,
    userId,
    SYSTEM_PROMPTS.live_monitoring,
    JSON.stringify({
      strategy_name: pipeline.strategy_name,
      strategy_type: pipeline.strategy_type,
      live_capital: liveCapital,
      capital_percent: initial_percent,
      target_percent,
      market_data: {
        latest_price: marketData?.latestPrice,
        spread: marketData?.spread,
        source: marketData?.source
      },
      indicators: {
        rsi: indicators.rsi,
        macd: indicators.macd,
        ma: indicators.ma
      },
      backtest_summary: pipeline.backtest_data?.backtest_result,
      paper_summary: pipeline.paper_data?.summary
    }, null, 2),
    { timeout: 30000 }
  )

  const liveData = {
    live_capital: liveCapital,
    capital_percent: initial_percent,
    target_percent,
    ai_monitoring: aiMonitoring,
    monitoring_levels: {
      data: { status: 'active', last_check: new Date().toISOString() },
      strategy: { status: 'active', performance: 'pending' },
      system: { status: 'active', health: 'healthy' }
    },
    deployment_steps: [
      { step: 1, description: `1% 资金测试 (${liveCapital.toFixed(0)})`, status: 'active' },
      { step: 2, description: `扩大到 5% 资金`, status: 'pending' },
      { step: 3, description: `扩大到 ${target_percent * 100}% 资金`, status: 'pending' },
      { step: 4, description: '多账户部署', status: 'pending' },
      { step: 5, description: '全品种运行', status: 'pending' }
    ],
    timestamp: new Date().toISOString()
  }

  db.prepare(`
    UPDATE quant_pipeline_stages
    SET live_data = ?, current_stage = 'live',
        stage_status = 'in_progress',
        live_capital_percent = ?,
        monitoring_data = ?,
        updated_at = datetime('now', 'localtime')
    WHERE id = ? AND user_id = ?
  `).run(
    JSON.stringify(liveData),
    initial_percent,
    JSON.stringify(liveData.monitoring_levels),
    pipelineId, userId
  )

  return {
    pipeline: getPipeline(pipelineId, userId),
    live_data: liveData,
    ai_monitoring: aiMonitoring
  }
}

// ============ 获取 Pipeline 看板 ============
export async function getPipelineDashboard(userId) {
  const pipelines = listPipelines(userId, 50)

  // 统计
  const stats = {
    total: pipelines.length,
    design: pipelines.filter(p => p.current_stage === 'design').length,
    backtest: pipelines.filter(p => p.current_stage === 'backtest').length,
    paper: pipelines.filter(p => p.current_stage === 'paper').length,
    live: pipelines.filter(p => p.current_stage === 'live').length,
    completed: pipelines.filter(p => p.current_stage === 'completed').length,
    failed: pipelines.filter(p => p.current_stage === 'failed').length
  }

  // 获取默认 AI 模型
  const defaultModel = getDefaultModel(userId)

  return {
    stats,
    pipelines,
    default_model: defaultModel ? {
      id: defaultModel.id,
      name: defaultModel.name,
      provider: defaultModel.provider,
      model_id: defaultModel.model_id,
      status: defaultModel.status
    } : null
  }
}

export default {
  createPipeline,
  getPipeline,
  listPipelines,
  stage1Design,
  stage2Backtest,
  stage3PaperTrading,
  stage4LiveDeployment,
  getPipelineDashboard
}
