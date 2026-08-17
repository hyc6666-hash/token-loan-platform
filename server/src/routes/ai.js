/**
 * AI 诊断 API 路由
 *
 * 提供实时 AI 诊断、市场情绪、交易信号等接口
 */

import express from 'express'
import { performDiagnosis, getDiagnosisHistory, getSentimentTrend } from '../services/aiDiagnosis.js'
import { scrapeKaiMarket, analyzeOrderBookDepth } from '../services/kaiScraper.js'

const router = express.Router()

/**
 * GET /api/ai/diagnosis
 * 执行实时 AI 诊断
 * Query: model=GLM-5.2&capital=1000000&riskPreference=moderate
 */
router.get('/diagnosis', async (req, res) => {
  try {
    const { model = 'GLM-5.2', capital = 1000000, riskPreference = 'moderate' } = req.query

    const result = await performDiagnosis({
      model,
      capital: parseInt(capital),
      riskPreference
    })

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/ai/market-data
 * 获取 KAI 实时市场数据（爬虫）
 */
router.get('/market-data', async (req, res) => {
  try {
    const data = await scrapeKaiMarket()
    const depth = analyzeOrderBookDepth(data.orderBook)

    res.json({
      success: true,
      data: {
        ...data,
        orderBookDepth: depth
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/ai/history
 * 获取诊断历史
 * Query: limit=20
 */
router.get('/history', (req, res) => {
  try {
    const { limit = 20 } = req.query
    const history = getDiagnosisHistory(parseInt(limit))

    res.json({
      success: true,
      data: history,
      count: history.length
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/ai/sentiment
 * 获取市场情绪趋势
 */
router.get('/sentiment', (req, res) => {
  try {
    const trend = getSentimentTrend()

    res.json({
      success: true,
      data: trend
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/ai/diagnosis
 * 执行自定义诊断（POST 版本，支持 body 参数）
 */
router.post('/diagnosis', async (req, res) => {
  try {
    const { model = 'GLM-5.2', capital = 1000000, riskPreference = 'moderate' } = req.body || {}

    const result = await performDiagnosis({
      model,
      capital: parseInt(capital),
      riskPreference
    })

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
