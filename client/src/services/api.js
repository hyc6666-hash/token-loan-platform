/**
 * API 服务层 — KAI 算力期货量化交易系统
 */

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

// 默认请求超时：8秒
const DEFAULT_TIMEOUT = 8000

// 封装fetch请求（带超时）
async function request(url, options = {}) {
  const token = localStorage.getItem('token')
  const timeout = options.timeout || DEFAULT_TIMEOUT

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      ...options,
      headers,
      signal: controller.signal
    })

    const data = await response.json()

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token')
      }
      throw new Error(data.error || '请求失败')
    }

    return data
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('请求超时，请稍后重试')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

// ============ 认证 API ============
export const authApi = {
  register: (formData) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(formData)
  }),
  login: (phone, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password })
  }),
  getMe: () => request('/auth/me')
}

// ============ 量化交易 - 行情 API ============
export const marketApi = {
  getOverview: () => request('/market/overview'),
  getModels: () => request('/market/models'),
  getQuote: (modelCode, region = 'SG1') => request(`/market/quote/${modelCode}?region=${region}`),
  getQuotes: (region = 'SG1') => request(`/market/quotes?region=${region}`),
  getCandles: (modelCode, region = 'SG1', timeframe = '1h', limit = 100) =>
    request(`/market/candles/${modelCode}?region=${region}&timeframe=${timeframe}&limit=${limit}`),
  getIndicators: (modelCode, region = 'SG1', timeframe = '1h') =>
    request(`/market/indicators/${modelCode}?region=${region}&timeframe=${timeframe}`),
  getForwards: () => request('/market/forwards'),
  getRegions: () => request('/market/regions'),
  saveSnapshot: () => request('/market/snapshot', { method: 'POST' })
}

// ============ 量化交易 - 交易 API ============
export const tradingApi = {
  getPortfolio: () => request('/trading/portfolio'),
  createOrder: (data) => request('/trading/orders', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getOrders: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/trading/orders${query ? '?' + query : ''}`)
  },
  cancelOrder: (orderId) => request(`/trading/orders/${orderId}`, { method: 'DELETE' }),
  fillOrder: (orderId, data) => request(`/trading/orders/${orderId}/fill`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getPositions: (status = 'open') => request(`/trading/positions?status=${status}`),
  closePosition: (positionId) => request(`/trading/positions/${positionId}/close`, { method: 'POST' }),
  getTrades: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/trading/trades${query ? '?' + query : ''}`)
  }
}

// ============ 量化交易 - 策略 API ============
export const strategyApi = {
  getTypes: () => request('/strategy/types'),
  aiRecommend: (capital, risk_preference) => request('/strategy/ai-recommend', {
    method: 'POST',
    body: JSON.stringify({ capital, risk_preference })
  }),
  getTiers: () => request('/strategy/tiers'),
  getTier: (capital) => request(`/strategy/tier/${capital}`),
  list: () => request('/strategy'),
  create: (data) => request('/strategy', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (strategyId, data) => request(`/strategy/${strategyId}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  delete: (strategyId) => request(`/strategy/${strategyId}`, { method: 'DELETE' }),
  generateSignals: (strategyId) => request(`/strategy/${strategyId}/signals`, { method: 'POST' }),
  getSignals: (strategyId, limit = 20) => request(`/strategy/${strategyId}/signals?limit=${limit}`)
}

// ============ 量化交易 - 风控 API ============
export const riskApi = {
  getDashboard: () => request('/risk/dashboard'),
  getCapital: () => request('/risk/capital'),
  updateCapital: (data) => request('/risk/capital', {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  getRules: () => request('/risk/rules'),
  updateRule: (ruleId, data) => request(`/risk/rules/${ruleId}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  assess: () => request('/risk/assess', { method: 'POST' }),
  getAlerts: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/risk/alerts${query ? '?' + query : ''}`)
  },
  acknowledgeAlert: (alertId) => request(`/risk/alerts/${alertId}/acknowledge`, { method: 'POST' })
}

// ============ 量化交易 - 设置 API ============
export const settingsApi = {
  getApiSettings: () => request('/settings/api'),
  updateApiSetting: (settingId, data) => request(`/settings/api/${settingId}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  testApiConnection: (settingId) => request(`/settings/api/${settingId}/test`, { method: 'POST' }),
  getSystem: () => request('/settings/system')
}

// ============ AI 诊断 API ============
export const aiApi = {
  getDiagnosis: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/ai/diagnosis${query ? '?' + query : ''}`, { timeout: 15000 })
  },
  getMarketData: () => request('/ai/market-data', { timeout: 15000 }),
  getHistory: (limit = 20) => request(`/ai/history?limit=${limit}`),
  getSentiment: () => request('/ai/sentiment'),
  postDiagnosis: (data) => request('/ai/diagnosis', {
    method: 'POST',
    body: JSON.stringify(data),
    timeout: 15000
  })
}

// ============ Pipeline 四阶段量化 API ============
export const pipelineApi = {
  // 看板
  getDashboard: () => request('/pipeline/dashboard', { timeout: 15000 }),
  listPipelines: (limit = 50) => request(`/pipeline?limit=${limit}`),
  getPipeline: (pipelineId) => request(`/pipeline/${pipelineId}`),
  createPipeline: (data) => request('/pipeline', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // 四阶段
  stage1Design: (pipelineId, data = {}) => request(`/pipeline/${pipelineId}/stage1`, {
    method: 'POST',
    body: JSON.stringify(data),
    timeout: 30000
  }),
  stage2Backtest: (pipelineId, data = {}) => request(`/pipeline/${pipelineId}/stage2`, {
    method: 'POST',
    body: JSON.stringify(data),
    timeout: 30000
  }),
  stage3Paper: (pipelineId, data = {}) => request(`/pipeline/${pipelineId}/stage3`, {
    method: 'POST',
    body: JSON.stringify(data),
    timeout: 30000
  }),
  stage4Live: (pipelineId, data = {}) => request(`/pipeline/${pipelineId}/stage4`, {
    method: 'POST',
    body: JSON.stringify(data),
    timeout: 30000
  }),

  // AI 模型管理
  getProviders: () => request('/pipeline/ai/providers'),
  getAIModels: () => request('/pipeline/ai/models'),
  createAIModel: (data) => request('/pipeline/ai/models', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateAIModel: (modelId, data) => request(`/pipeline/ai/models/${modelId}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  deleteAIModel: (modelId) => request(`/pipeline/ai/models/${modelId}`, {
    method: 'DELETE'
  }),
  testAIModel: (modelId) => request(`/pipeline/ai/models/${modelId}/test`, {
    method: 'POST',
    timeout: 20000
  }),

  // AI 分析
  aiAnalyze: (data) => request('/pipeline/ai/analyze', {
    method: 'POST',
    body: JSON.stringify(data),
    timeout: 30000
  }),

  // 回测
  listBacktests: (limit = 20) => request(`/pipeline/backtests?limit=${limit}`),
  getBacktest: (backtestId) => request(`/pipeline/backtests/${backtestId}`),
  runBacktest: (data) => request('/pipeline/backtests', {
    method: 'POST',
    body: JSON.stringify(data),
    timeout: 30000
  }),
  getStrategyTypes: () => request('/pipeline/strategy-types'),

  // 模拟交易
  getPaperState: () => request('/pipeline/paper-trading/state'),
  paperTrade: (data) => request('/pipeline/paper-trading/trade', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  stopPaper: () => request('/pipeline/paper-trading/stop', { method: 'POST' })
}
