import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  getRiskConfig, updateCapitalConfig, getRiskRules, updateRiskRule,
  assessRisk, getRiskAlerts, acknowledgeAlert, getRiskDashboard
} from '../services/riskEngine.js'

const router = Router()

// 所有风控路由需要认证
router.use(authMiddleware)

// 获取风控仪表盘
router.get('/dashboard', (req, res) => {
  try {
    const dashboard = getRiskDashboard(req.user.id)
    res.json(dashboard)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 获取资金配置
router.get('/capital', (req, res) => {
  try {
    const config = getRiskConfig(req.user.id)
    res.json(config)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 更新资金配置
router.patch('/capital', (req, res) => {
  try {
    const config = updateCapitalConfig(req.user.id, req.body)
    res.json(config)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 获取风控规则
router.get('/rules', (req, res) => {
  try {
    const rules = getRiskRules(req.user.id)
    res.json(rules)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 更新风控规则
router.patch('/rules/:ruleId', (req, res) => {
  try {
    const rule = updateRiskRule(req.params.ruleId, req.body)
    if (!rule) return res.status(404).json({ error: '规则不存在' })
    res.json(rule)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 实时风险评估
router.post('/assess', (req, res) => {
  try {
    const assessment = assessRisk(req.user.id)
    res.json(assessment)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 获取风控告警
router.get('/alerts', (req, res) => {
  try {
    const { acknowledged, limit } = req.query
    const alerts = getRiskAlerts(req.user.id, {
      acknowledged: acknowledged !== undefined ? acknowledged === 'true' : undefined,
      limit: limit ? parseInt(limit) : 50
    })
    res.json(alerts)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 确认告警
router.post('/alerts/:alertId/acknowledge', (req, res) => {
  try {
    acknowledgeAlert(req.params.alertId, req.user.id)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
