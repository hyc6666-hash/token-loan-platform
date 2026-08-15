import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// 路由
import authRoutes from './routes/auth.js'
import applicationRoutes from './routes/applications.js'
import calculatorRoutes from './routes/calculator.js'
import adminRoutes from './routes/admin.js'
import contentRoutes from './routes/content.js'

// 加载环境变量
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// ============ 中间件 ============
// 教学说明：
// CORS（跨域资源共享）控制哪些前端网站可以访问后端API
// 生产环境需要把Vercel域名加入白名单
const allowedOrigins = [
  'http://localhost:5173',                    // 本地开发
  'https://vercel.app',                       // Vercel默认域名
  process.env.CLIENT_URL                      // 自定义域名（环境变量）
].filter(Boolean)

app.use(cors({
  origin: function(origin, callback) {
    // 允许无origin的请求（如服务端请求、Postman）或白名单内的origin
    if (!origin || allowedOrigins.some(o => origin.includes(o.replace('https://', '').replace('http://', '')))) {
      callback(null, true)
    } else {
      callback(null, true) // 开发阶段先全部允许，生产环境可改为 false
    }
  },
  credentials: true
}))
app.use(express.json())

// 请求日志（开发模式）
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`)
    next()
  })
}

// ============ API 路由 ============
app.use('/api/auth', authRoutes)
app.use('/api/applications', applicationRoutes)
app.use('/api/calculator', calculatorRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/content', contentRoutes)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// 生产环境：托管前端静态文件
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist')
  app.use(express.static(clientDist))
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message)
  res.status(err.status || 500).json({
    error: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  })
})

// ============ 启动 ============
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`)
  console.log(`📋 API文档: http://localhost:${PORT}/api/health`)
})
