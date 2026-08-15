import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../database/init.js'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router()

/**
 * 申请路由
 * 
 * 教学说明：
 * 业务流程：用户提交申请 → 待审核(pending) → 审核中(reviewing) → 通过/驳回
 * 
 * 状态机：
 * pending → reviewing → approved
 *                    → rejected
 * pending → withdrawn（用户撤回）
 */

// 提交申请（需要登录）
router.post('/', authMiddleware, (req, res) => {
  try {
    const { product_type, company_name, contact_name, phone, annual_compute_cost, annual_token_cost, ip_count, notes } = req.body

    if (!product_type || !company_name || !contact_name || !phone) {
      return res.status(400).json({ error: '产品类型、企业名称、联系人和手机号为必填项' })
    }

    const id = uuidv4()

    // 服务端计算预估额度
    let estimated = 0
    const compute = annual_compute_cost || 0
    const token = annual_token_cost || 0
    const ip = ip_count || 0

    if (product_type === 'compute' || product_type === 'token') {
      estimated += Math.min(Math.round(compute * 10000 * 0.3), 20000000)
    }
    if (token > 0) {
      estimated += Math.min(Math.round(token * 10000 * 0.5), 5000000)
    }
    if (product_type === 'token' && token > 0) {
      estimated += token * 10000 * 3
    }
    if (product_type === 'opc') {
      estimated += token * 10000 * 2 + ip * 50000
      if (token === 0) estimated += ip * 50000 + 100000
    }

    db.prepare(`
      INSERT INTO applications (id, user_id, product_type, company_name, contact_name, phone, annual_compute_cost, annual_token_cost, ip_count, notes, estimated_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, product_type, company_name, contact_name, phone, compute, token, ip, notes || null, estimated)

    res.status(201).json({
      message: '申请提交成功',
      application: { id, product_type, estimated_amount: estimated, status: 'pending' }
    })
  } catch (err) {
    console.error('申请提交错误:', err)
    res.status(500).json({ error: '提交失败，请稍后重试' })
  }
})

// 查询我的申请列表（需要登录）
router.get('/my', authMiddleware, (req, res) => {
  const applications = db.prepare(`
    SELECT id, product_type, company_name, status, estimated_amount, created_at, updated_at
    FROM applications WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(req.user.id)

  res.json({ applications })
})

// 查询申请详情（需要登录）
router.get('/:id', authMiddleware, (req, res) => {
  const app = db.prepare(`
    SELECT a.*, u.company_name as user_company
    FROM applications a
    JOIN users u ON a.user_id = u.id
    WHERE a.id = ? AND (a.user_id = ? OR ? = 'admin')
  `).get(req.params.id, req.user.id, req.user.role)

  if (!app) {
    return res.status(404).json({ error: '申请不存在' })
  }
  res.json({ application: app })
})

// 撤回申请（需要登录，仅pending状态可撤回）
router.patch('/:id/withdraw', authMiddleware, (req, res) => {
  const app = db.prepare('SELECT * FROM applications WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!app) {
    return res.status(404).json({ error: '申请不存在' })
  }
  if (app.status !== 'pending') {
    return res.status(400).json({ error: '仅待审核的申请可以撤回' })
  }

  db.prepare("UPDATE applications SET status = 'withdrawn', updated_at = datetime('now','localtime') WHERE id = ?").run(req.params.id)
  res.json({ message: '申请已撤回' })
})

export default router
