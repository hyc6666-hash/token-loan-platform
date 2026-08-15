import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import db from '../database/init.js'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router()

/**
 * 认证路由
 * 
 * 教学说明：
 * RESTful API 设计规范：
 * - POST /api/auth/register  → 注册
 * - POST /api/auth/login     → 登录
 * - GET  /api/auth/me        → 获取当前用户信息
 * 
 * HTTP方法语义：
 * - GET  = 读取数据（不修改）
 * - POST = 创建新数据
 * - PUT  = 更新整个资源
 * - PATCH = 部分更新
 * - DELETE = 删除
 */

// 注册
router.post('/register', (req, res) => {
  try {
    const { company_name, contact_name, phone, email, password, company_type, region_beijing } = req.body

    // 参数校验
    if (!company_name || !contact_name || !phone || !password) {
      return res.status(400).json({ error: '企业名称、联系人、手机号和密码为必填项' })
    }

    // 检查手机号是否已注册
    const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone)
    if (existing) {
      return res.status(409).json({ error: '该手机号已注册' })
    }

    // 密码加密（bcrypt是单向哈希，不可逆，保护用户密码安全）
    const password_hash = bcrypt.hashSync(password, 10)
    const id = uuidv4()

    db.prepare(`
      INSERT INTO users (id, company_name, contact_name, phone, email, password_hash, company_type, region_beijing)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, company_name, contact_name, phone, email || null, password_hash, company_type || 'ai', region_beijing !== undefined ? region_beijing : 1)

    // 生成JWT令牌
    const token = jwt.sign(
      { id, company_name, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    res.status(201).json({
      message: '注册成功',
      token,
      user: { id, company_name, contact_name, phone, role: 'user' }
    })
  } catch (err) {
    console.error('注册错误:', err)
    res.status(500).json({ error: '注册失败，请稍后重试' })
  }
})

// 登录
router.post('/login', (req, res) => {
  try {
    const { phone, password } = req.body

    if (!phone || !password) {
      return res.status(400).json({ error: '手机号和密码为必填项' })
    }

    const user = db.prepare('SELECT * FROM users WHERE phone = ? AND status = ?').get(phone, 'active')
    if (!user) {
      return res.status(401).json({ error: '手机号或密码错误' })
    }

    // 验证密码（对比哈希值）
    const valid = bcrypt.compareSync(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ error: '手机号或密码错误' })
    }

    const token = jwt.sign(
      { id: user.id, company_name: user.company_name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        company_name: user.company_name,
        contact_name: user.contact_name,
        phone: user.phone,
        email: user.email,
        company_type: user.company_type,
        role: user.role
      }
    })
  } catch (err) {
    console.error('登录错误:', err)
    res.status(500).json({ error: '登录失败，请稍后重试' })
  }
})

// 获取当前用户信息（需要登录）
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, company_name, contact_name, phone, email, company_type, region_beijing, role, created_at FROM users WHERE id = ?').get(req.user.id)
  if (!user) {
    return res.status(404).json({ error: '用户不存在' })
  }
  res.json({ user })
})

export default router
