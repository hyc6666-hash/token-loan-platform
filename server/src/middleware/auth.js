import jwt from 'jsonwebtoken'

/**
 * JWT认证中间件
 * 
 * 教学说明：
 * JWT（JSON Web Token）是一种无状态认证方式。
 * 用户登录后，服务器生成一个加密的token返回给前端。
 * 前端每次请求API时在Header中携带token，服务器验证token有效性。
 * 
 * 优点：无需在服务器端存储session，适合前后端分离架构
 */
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录，请先登录' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded  // 将用户信息挂载到req上，后续路由可直接使用
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '登录已过期，请重新登录' })
    }
    return res.status(401).json({ error: '无效的认证信息' })
  }
}

/**
 * 管理员权限中间件
 * 在authMiddleware之后使用，检查用户是否为管理员
 */
export function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '权限不足，需要管理员权限' })
  }
  next()
}
