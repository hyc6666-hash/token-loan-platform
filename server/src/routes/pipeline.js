import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  createPipeline, getPipeline, listPipelines,
  stage1Design, stage2Backtest, stage3PaperTrading, stage4LiveDeployment,
  getPipelineDashboard
} from '../services/strategyPipeline.js'
import {
  getUserModels, createModel, updateModel, deleteModel,
  testModelConnection, MODEL_PROVIDERS, callAIModel, SYSTEM_PROMPTS
} from '../services/aiModelRouter.js'
import { runBacktest, getBacktestResult, listBacktests, STRATEGY_TYPES } from '../services/backtestEngine.js'
import { getPaperTradingState, executePaperTrade, stopPaperTrading } from '../services/paperTrading.js'
import { scrapeKaiMarket } from '../services/kaiScraper.js'
import { getCandles, calculateIndicators } from '../services/marketData.js'

const router = Router()
router.use(authMiddleware)

// ============ Pipeline 管理 ============

// 获取 Pipeline 看板
router.get('/dashboard', async (req, res) => {
  try {
    const dashboard = await getPipelineDashboard(req.user.id)
    res.json(dashboard)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 列出所有 Pipelines
router.get('/', (req, res) => {
  try {
    const pipelines = listPipelines(req.user.id, parseInt(req.query.limit) || 50)
    res.json(pipelines)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 获取单个 Pipeline
router.get('/:pipelineId', (req, res) => {
  try {
    const pipeline = getPipeline(req.params.pipelineId, req.user.id)
    if (!pipeline) return res.status(404).json({ error: 'Pipeline 不存在' })
    res.json(pipeline)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 创建 Pipeline
router.post('/', async (req, res) => {
  try {
    const pipeline = createPipeline(req.user.id, req.body)
    res.json(pipeline)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ============ 阶段1: 策略设计 ============
router.post('/:pipelineId/stage1', async (req, res) => {
  try {
    const result = await stage1Design(req.user.id, req.params.pipelineId, req.body)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ============ 阶段2: 回测 ============
router.post('/:pipelineId/stage2', async (req, res) => {
  try {
    const result = await stage2Backtest(req.user.id, req.params.pipelineId, req.body)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ============ 阶段3: 模拟交易 ============
router.post('/:pipelineId/stage3', async (req, res) => {
  try {
    const result = await stage3PaperTrading(req.user.id, req.params.pipelineId, req.body)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ============ 阶段4: 实盘部署 ============
router.post('/:pipelineId/stage4', async (req, res) => {
  try {
    const result = await stage4LiveDeployment(req.user.id, req.params.pipelineId, req.body)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ============ AI 模型管理 ============

// 获取模型提供商列表
router.get('/ai/providers', (req, res) => {
  res.json(MODEL_PROVIDERS)
})

// 获取用户的 AI 模型列表
router.get('/ai/models', (req, res) => {
  try {
    const models = getUserModels(req.user.id)
    res.json(models)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 创建 AI 模型
router.post('/ai/models', (req, res) => {
  try {
    const model = createModel(req.user.id, req.body)
    res.json(model)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 更新 AI 模型
router.patch('/ai/models/:modelId', (req, res) => {
  try {
    const model = updateModel(req.params.modelId, req.user.id, req.body)
    if (!model) return res.status(404).json({ error: '模型不存在' })
    res.json(model)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 删除 AI 模型
router.delete('/ai/models/:modelId', (req, res) => {
  try {
    deleteModel(req.params.modelId, req.user.id)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 测试 AI 模型连接
router.post('/ai/models/:modelId/test', async (req, res) => {
  try {
    const result = await testModelConnection(req.params.modelId, req.user.id)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ============ AI 分析 ============

// AI 市场诊断
router.post('/ai/analyze', async (req, res) => {
  try {
    const { ai_model_id, analysis_type = 'market_diagnosis', custom_prompt } = req.body

    // 获取市场数据
    let marketData = null
    try {
      marketData = await scrapeKaiMarket()
    } catch { /* ignore */ }

    const candles = getCandles('GLM-5.2', 'HK1', '1h', 50)
    const indicators = calculateIndicators(candles)

    const systemPrompt = SYSTEM_PROMPTS[analysis_type] || SYSTEM_PROMPTS.market_diagnosis
    const userPrompt = custom_prompt || JSON.stringify({
      market_data: {
        latest_price: marketData?.latestPrice,
        spread: marketData?.spread,
        source: marketData?.source,
        order_book: marketData?.orderBook
      },
      indicators: {
        rsi: indicators.rsi,
        macd: indicators.macd,
        macd_signal: indicators.macd_signal,
        ma: indicators.ma,
        bollinger: indicators.bollinger,
        avg_volume: indicators.avg_volume
      },
      timestamp: new Date().toISOString()
    }, null, 2)

    const result = await callAIModel(ai_model_id, req.user.id, systemPrompt, userPrompt, { timeout: 30000 })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ============ 回测管理 ============

// 列出回测结果
router.get('/backtests', (req, res) => {
  try {
    const results = listBacktests(req.user.id, parseInt(req.query.limit) || 20)
    res.json(results)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 获取回测详情
router.get('/backtests/:backtestId', (req, res) => {
  try {
    const result = getBacktestResult(req.params.backtestId, req.user.id)
    if (!result) return res.status(404).json({ error: '回测结果不存在' })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 手动运行回测
router.post('/backtests', async (req, res) => {
  try {
    const result = await runBacktest(req.user.id, req.body)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 获取策略类型
router.get('/strategy-types', (req, res) => {
  res.json(STRATEGY_TYPES)
})

// ============ 模拟交易 ============

// 获取模拟交易状态
router.get('/paper-trading/state', (req, res) => {
  try {
    const state = getPaperTradingState(req.user.id)
    res.json(state || { status: 'not_initialized' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 执行模拟交易
router.post('/paper-trading/trade', async (req, res) => {
  try {
    const result = await executePaperTrade(req.user.id, req.body)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 停止模拟交易
router.post('/paper-trading/stop', (req, res) => {
  try {
    const result = stopPaperTrading(req.user.id)
    res.json(result || { status: 'not_running' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
