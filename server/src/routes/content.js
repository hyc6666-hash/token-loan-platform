import express from 'express'
import db from '../database/init.js'

const router = express.Router()

/**
 * 内容管理路由（公开API）
 * 
 * 教学说明：
 * 这些API不需要登录即可访问，因为政策、产品、案例是公开展示的内容。
 * 但修改操作（PUT/DELETE）需要管理员权限，在admin路由中处理。
 * 
 * 这体现了"读写分离"的设计思想：
 * - 读操作（GET）：公开，任何人可访问
 * - 写操作（POST/PUT/DELETE）：受保护，需要权限
 */

// 获取政策列表
router.get('/policies', (req, res) => {
  const policies = db.prepare(`
    SELECT * FROM policies 
    WHERE status = 'published' 
    ORDER BY sort_order ASC, is_latest DESC
  `).all()

  // 解析highlights JSON
  const result = policies.map(p => ({
    ...p,
    highlights: p.highlights ? JSON.parse(p.highlights) : []
  }))

  res.json({ policies: result })
})

// 获取产品列表
router.get('/products', (req, res) => {
  const products = db.prepare(`
    SELECT * FROM products 
    WHERE status = 'published' 
    ORDER BY sort_order ASC
  `).all()

  const result = products.map(p => ({
    ...p,
    features: p.features ? JSON.parse(p.features) : []
  }))

  res.json({ products: result })
})

// 获取案例列表
router.get('/cases', (req, res) => {
  const cases = db.prepare(`
    SELECT * FROM cases 
    WHERE status = 'published' 
    ORDER BY sort_order ASC
  `).all()

  res.json({ cases })
})

export default router
