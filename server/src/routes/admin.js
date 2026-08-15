import express from 'express'
import db from '../database/init.js'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'

const router = express.Router()

/**
 * 管理后台路由
 * 
 * 教学说明：
 * 管理后台是动态网站的核心——让运营人员可以自行管理内容，
 * 而不需要每次修改都找开发人员改代码。
 * 
 * 这就是"动态"和"静态"的根本区别：
 * - 静态网站：内容写死在HTML里，改内容=改代码
 * - 动态网站：内容存在数据库里，改内容=在后台操作
 */

// 所有管理路由都需要登录+管理员权限
router.use(authMiddleware, adminMiddleware)

// ============ 申请管理 ============

// 获取所有申请
router.get('/applications', (req, res) => {
  const { status, page = 1, limit = 20 } = req.query
  const offset = (page - 1) * limit

  let query = 'SELECT a.*, u.company_name as user_company, u.phone as user_phone FROM applications a JOIN users u ON a.user_id = u.id'
  let countQuery = 'SELECT COUNT(*) as total FROM applications'
  const params = []

  if (status) {
    query += ' WHERE a.status = ?'
    countQuery += ' WHERE status = ?'
    params.push(status)
  }

  query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?'

  const total = db.prepare(countQuery).get(...params).total
  const applications = db.prepare(query).all(...params, Number(limit), Number(offset))

  res.json({
    applications,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit)
    }
  })
})

// 审核申请
router.patch('/applications/:id/review', (req, res) => {
  const { status, review_note } = req.body

  if (!['approved', 'rejected', 'reviewing'].includes(status)) {
    return res.status(400).json({ error: '无效的审核状态' })
  }

  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id)
  if (!app) {
    return res.status(404).json({ error: '申请不存在' })
  }

  db.prepare(`
    UPDATE applications 
    SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = datetime('now','localtime'), updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(status, review_note || null, req.user.id, req.params.id)

  res.json({ message: `申请已${status === 'approved' ? '通过' : status === 'rejected' ? '驳回' : '进入审核'}` })
})

// ============ 用户管理 ============

router.get('/users', (req, res) => {
  const users = db.prepare('SELECT id, company_name, contact_name, phone, email, company_type, role, status, created_at FROM users ORDER BY created_at DESC').all()
  res.json({ users })
})

router.patch('/users/:id/status', (req, res) => {
  const { status } = req.body
  if (!['active', 'disabled'].includes(status)) {
    return res.status(400).json({ error: '无效状态' })
  }
  db.prepare("UPDATE users SET status = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(status, req.params.id)
  res.json({ message: `用户已${status === 'active' ? '启用' : '禁用'}` })
})

// ============ 统计数据 ============

router.get('/stats', (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('user').count
  const totalApps = db.prepare('SELECT COUNT(*) as count FROM applications').get().count
  const pendingApps = db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'pending'").get().count
  const approvedApps = db.prepare("SELECT COUNT(*) as count FROM applications WHERE status = 'approved'").get().count
  const totalEstimated = db.prepare('SELECT COALESCE(SUM(estimated_amount), 0) as total FROM applications WHERE status = ?').get('approved').total

  // 按产品类型统计
  const byProduct = db.prepare('SELECT product_type, COUNT(*) as count FROM applications GROUP BY product_type').all()

  res.json({
    totalUsers,
    totalApplications: totalApps,
    pendingApplications: pendingApps,
    approvedApplications: approvedApps,
    totalEstimatedAmount: totalEstimated,
    byProduct
  })
})

export default router
