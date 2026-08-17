import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  createStrategy, getUserStrategies, updateStrategy, deleteStrategy,
  generateSignals, getStrategySignals, getStrategyTypes, STRATEGY_TYPES
} from '../services/strategyEngine.js'
import { recommendStrategy, getAllTiers, getCapitalTier } from '../services/aiAdvisor.js'

const router = Router()

// 公开路由（无需认证）
// 获取策略类型定义
router.get('/types', (req, res) => {
  try {
    const types = getStrategyTypes()
    res.json(types)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 获取资金分级
router.get('/tiers', (req, res) => {
  try {
    const tiers = getAllTiers()
    res.json(tiers)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 获取资金分级（根据金额）
router.get('/tier/:capital', (req, res) => {
  try {
    const capital = parseFloat(req.params.capital)
    const tier = getCapitalTier(capital)
    res.json(tier)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// AI 策略推荐（公开，无需登录）
router.post('/ai-recommend', (req, res) => {
  try {
    const { capital, risk_preference } = req.body
    if (!capital || capital <= 0) {
      return res.status(400).json({ error: '请输入有效的资金金额' })
    }
    const userId = req.user?.id || 'anonymous'
    const recommendation = recommendStrategy(userId, capital, risk_preference)
    res.json(recommendation)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 以下路由需要认证
router.use(authMiddleware)

// 获取用户策略列表
router.get('/', (req, res) => {
  try {
    const strategies = getUserStrategies(req.user.id)
    res.json(strategies)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 创建策略
router.post('/', (req, res) => {
  try {
    const strategy = createStrategy(req.user.id, req.body)
    res.json(strategy)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 更新策略
router.patch('/:strategyId', (req, res) => {
  try {
    const strategy = updateStrategy(req.params.strategyId, req.user.id, req.body)
    if (!strategy) return res.status(404).json({ error: '策略不存在' })
    res.json(strategy)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 删除策略
router.delete('/:strategyId', (req, res) => {
  try {
    deleteStrategy(req.params.strategyId, req.user.id)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 生成策略信号
router.post('/:strategyId/signals', (req, res) => {
  try {
    const signals = generateSignals(req.user.id, req.params.strategyId)
    res.json({ signals, count: signals.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 获取策略信号
router.get('/:strategyId/signals', (req, res) => {
  try {
    const { limit } = req.query
    const signals = getStrategySignals(req.params.strategyId, limit ? parseInt(limit) : 20)
    res.json(signals)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
