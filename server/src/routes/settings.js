import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import db from '../database/quant-init.js'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

// 所有设置路由需要认证
router.use(authMiddleware)

// 获取API设置
router.get('/api', (req, res) => {
  try {
    let settings = db.prepare('SELECT * FROM quant_api_settings WHERE user_id = ?').all(req.user.id)
    
    // 如果没有设置，创建默认的
    if (settings.length === 0) {
      const defaults = [
        {
          id: uuidv4(), user_id: req.user.id, platform: 'london',
          api_key: '', api_secret: '', base_url: 'https://london.kai.com',
          ws_url: 'wss://london.kai.com/ws', status: 'inactive',
          permissions: JSON.stringify(['read', 'trade'])
        },
        {
          id: uuidv4(), user_id: req.user.id, platform: 'hongkong',
          api_key: '', api_secret: '', base_url: 'https://hongkong.kai.com',
          ws_url: 'wss://hongkong.kai.com/ws', status: 'inactive',
          permissions: JSON.stringify(['read', 'trade'])
        }
      ]
      
      for (const d of defaults) {
        db.prepare(`
          INSERT INTO quant_api_settings (id, user_id, platform, api_key, api_secret, base_url, ws_url, status, permissions)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(d.id, d.user_id, d.platform, d.api_key, d.api_secret, d.base_url, d.ws_url, d.status, d.permissions)
      }
      
      settings = db.prepare('SELECT * FROM quant_api_settings WHERE user_id = ?').all(req.user.id)
    }
    
    // 解析 permissions
    const result = settings.map(s => ({
      ...s,
      permissions: typeof s.permissions === 'string' ? JSON.parse(s.permissions) : s.permissions
    }))
    
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 更新API设置
router.patch('/api/:settingId', (req, res) => {
  try {
    const { api_key, api_secret, base_url, ws_url, status, permissions } = req.body
    const fields = []
    const values = []
    
    if (api_key !== undefined) { fields.push('api_key = ?'); values.push(api_key) }
    if (api_secret !== undefined) { fields.push('api_secret = ?'); values.push(api_secret) }
    if (base_url !== undefined) { fields.push('base_url = ?'); values.push(base_url) }
    if (ws_url !== undefined) { fields.push('ws_url = ?'); values.push(ws_url) }
    if (status !== undefined) { fields.push('status = ?'); values.push(status) }
    if (permissions !== undefined) { fields.push('permissions = ?'); values.push(JSON.stringify(permissions)) }
    
    if (fields.length === 0) return res.status(400).json({ error: '无更新字段' })
    
    fields.push("updated_at = datetime('now', 'localtime')")
    values.push(req.params.settingId, req.user.id)
    
    db.prepare(`UPDATE quant_api_settings SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values)
    
    const updated = db.prepare('SELECT * FROM quant_api_settings WHERE id = ?').get(req.params.settingId)
    res.json({
      ...updated,
      permissions: typeof updated.permissions === 'string' ? JSON.parse(updated.permissions) : updated.permissions
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 测试API连接
router.post('/api/:settingId/test', (req, res) => {
  try {
    const setting = db.prepare('SELECT * FROM quant_api_settings WHERE id = ? AND user_id = ?').get(req.params.settingId, req.user.id)
    if (!setting) return res.status(404).json({ error: '设置不存在' })
    
    if (!setting.api_key || !setting.api_secret) {
      db.prepare(`
        UPDATE quant_api_settings SET status = 'error', last_error = ?, last_tested_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run('API密钥未配置', req.params.settingId)
      return res.json({ success: false, message: 'API密钥未配置，请先填写API Key和Secret' })
    }
    
    // 模拟测试连接
    const testResult = {
      success: true,
      message: '连接测试成功（模拟）',
      latency_ms: Math.round(50 + Math.random() * 100),
      permissions: ['read', 'trade'],
      server_time: new Date().toISOString()
    }
    
    db.prepare(`
      UPDATE quant_api_settings SET status = 'active', last_error = NULL, last_tested_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(req.params.settingId)
    
    res.json(testResult)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 获取系统设置
router.get('/system', (req, res) => {
  try {
    res.json({
      version: '4.0.0',
      mode: 'manual', // manual | semi_auto | full_auto
      features: {
        manual_trading: true,
        auto_trading: false,
        ai_advisor: true,
        risk_monitoring: true,
        websocket: false,
        api_integration: false
      },
      platforms: [
        { id: 'london', name: 'London (开港 ModelHub)', url: 'https://london.kai.com' },
        { id: 'hongkong', name: 'Hong Kong (KAI 模型服務容量市場)', url: 'https://hongkong.kai.com' }
      ],
      models: ['GLM-5.2', 'DeepSeek-V4', 'Qwen3-Max', 'Kimi-K3'],
      regions: ['SG1', 'EU1', 'US1', 'CN1', 'HK1', 'JP1']
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
