import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

// 路由
import authRoutes from './routes/auth.js'
import marketRoutes from './routes/market.js'
import tradingRoutes from './routes/trading.js'
import strategyRoutes from './routes/strategy.js'
import riskRoutes from './routes/risk.js'
import settingsRoutes from './routes/settings.js'
import aiRoutes from './routes/ai.js'
import pipelineRoutes from './routes/pipeline.js'

// 加载环境变量
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// ============ 中间件 ============
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://vercel.app',
  process.env.CLIENT_URL
].filter(Boolean)

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.some(o => origin.includes(o.replace('https://', '').replace('http://', '')))) {
      callback(null, true)
    } else {
      callback(null, true)
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
app.use('/api/market', marketRoutes)
app.use('/api/trading', tradingRoutes)
app.use('/api/strategy', strategyRoutes)
app.use('/api/risk', riskRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/pipeline', pipelineRoutes)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// 生产环境：托管前端静态文件（仅当目录存在时）
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist')
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist))
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'))
    })
  }
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
  console.log(`🚀 KAI 量化交易服务器运行在 http://localhost:${PORT}`)
  console.log(`📋 API文档: http://localhost:${PORT}/api/health`)
})
