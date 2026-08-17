import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  createOrder, cancelOrder, getOrders, getPositions, getTrades,
  closePosition, getPortfolioOverview
} from '../services/orderManager.js'

const router = Router()

// 所有交易路由需要认证
router.use(authMiddleware)

// 获取投资组合概览
router.get('/portfolio', (req, res) => {
  try {
    const overview = getPortfolioOverview(req.user.id)
    res.json(overview)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 创建订单
router.post('/orders', async (req, res) => {
  try {
    const result = await createOrder(req.user.id, req.body)
    if (!result.success) {
      return res.status(400).json(result)
    }
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 获取订单列表
router.get('/orders', (req, res) => {
  try {
    const { status, limit, offset } = req.query
    const orders = getOrders(req.user.id, {
      status,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    })
    res.json(orders)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 撤销订单
router.delete('/orders/:orderId', (req, res) => {
  try {
    const result = cancelOrder(req.params.orderId, req.user.id)
    if (!result.success) {
      return res.status(400).json(result)
    }
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 订单成交（手动确认）
router.post('/orders/:orderId/fill', (req, res) => {
  try {
    const { quantity, price } = req.body
    const result = fillOrder(req.params.orderId, req.user.id, quantity, price)
    if (!result.success) {
      return res.status(400).json(result)
    }
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 获取持仓列表
router.get('/positions', (req, res) => {
  try {
    const { status } = req.query
    const positions = getPositions(req.user.id, status || 'open')
    res.json(positions)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 平仓
router.post('/positions/:positionId/close', (req, res) => {
  try {
    const result = closePosition(req.params.positionId, req.user.id)
    if (!result.success) {
      return res.status(400).json(result)
    }
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 获取交易记录
router.get('/trades', (req, res) => {
  try {
    const { limit, offset, strategy_id } = req.query
    const trades = getTrades(req.user.id, {
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
      strategy_id
    })
    res.json(trades)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
