import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  getModels, getMarketQuote, getAllMarketQuotes, getCandles, generateCandles,
  calculateIndicators, getForwardContracts, getRegions, getMarketOverview,
  saveMarketSnapshot
} from '../services/marketData.js'

const router = Router()

// 获取市场概况
router.get('/overview', async (req, res) => {
  try {
    const overview = await getMarketOverview()
    res.json(overview)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 获取所有模型
router.get('/models', (req, res) => {
  try {
    const models = getModels()
    res.json(models)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 获取单个模型行情
router.get('/quote/:modelCode', (req, res) => {
  try {
    const { modelCode } = req.params
    const { region } = req.query
    const quote = getMarketQuote(modelCode, region || 'SG1')
    if (!quote) return res.status(404).json({ error: '模型不存在' })
    res.json(quote)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 获取所有模型行情
router.get('/quotes', (req, res) => {
  try {
    const { region } = req.query
    const quotes = getAllMarketQuotes(region || 'SG1')
    res.json(quotes)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 获取K线数据
router.get('/candles/:modelCode', (req, res) => {
  try {
    const { modelCode } = req.params
    const { region = 'SG1', timeframe = '1h', limit = 100 } = req.query
    const candles = getCandles(modelCode, region, timeframe, parseInt(limit))
    res.json(candles)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 生成K线数据
router.post('/candles/:modelCode/generate', (req, res) => {
  try {
    const { modelCode } = req.params
    const { region = 'SG1', timeframe = '1h', count = 100 } = req.body
    const candles = generateCandles(modelCode, region, timeframe, count)
    res.json(candles)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 获取技术指标
router.get('/indicators/:modelCode', (req, res) => {
  try {
    const { modelCode } = req.params
    const { region = 'SG1', timeframe = '1h' } = req.query
    const candles = getCandles(modelCode, region, timeframe, 100)
    const indicators = calculateIndicators(candles)
    res.json({ model_code: modelCode, indicators, candle_count: candles.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 获取远期合约
router.get('/forwards', (req, res) => {
  try {
    const contracts = getForwardContracts()
    res.json(contracts)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 获取区域列表
router.get('/regions', (req, res) => {
  try {
    const regions = getRegions()
    res.json(regions)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 保存行情快照
router.post('/snapshot', (req, res) => {
  try {
    const result = saveMarketSnapshot()
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
