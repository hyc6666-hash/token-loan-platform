/**
 * AI 模型路由器
 *
 * 支持接入多种 AI 模型（OpenAI 兼容接口）：
 * - OpenAI (GPT-4o, GPT-4o-mini)
 * - Anthropic (Claude 3.5 Sonnet)
 * - DeepSeek (DeepSeek-V3, DeepSeek-R1)
 * - 智谱 (GLM-5, GLM-5.2)
 * - 月之暗面 (Kimi K3)
 * - 阿里通义 (Qwen3-Max)
 * - 自定义兼容接口
 *
 * 所有模型统一使用 OpenAI 兼容的 chat/completions 接口
 */

import db from '../database/quant-init.js'
import { v4 as uuidv4 } from 'uuid'

// ============ 模型提供商预设 ============
export const MODEL_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    default_base: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', context: 128000 },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', context: 128000 },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', context: 128000 },
      { id: 'o3-mini', name: 'o3-mini', context: 200000 }
    ]
  },
  anthropic: {
    name: 'Anthropic',
    default_base: 'https://api.anthropic.com/v1',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', context: 200000 },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', context: 200000 },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', context: 200000 }
    ]
  },
  deepseek: {
    name: 'DeepSeek',
    default_base: 'https://api.deepseek.com/v1',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek-V3', context: 64000 },
      { id: 'deepseek-reasoner', name: 'DeepSeek-R1', context: 64000 }
    ]
  },
  zhipu: {
    name: '智谱AI',
    default_base: 'https://open.bigmodel.cn/api/paas/v4',
    models: [
      { id: 'glm-4-plus', name: 'GLM-4-Plus', context: 128000 },
      { id: 'glm-4-flash', name: 'GLM-4-Flash', context: 128000 },
      { id: 'glm-4-long', name: 'GLM-4-Long', context: 1000000 }
    ]
  },
  moonshot: {
    name: '月之暗面',
    default_base: 'https://api.moonshot.cn/v1',
    models: [
      { id: 'moonshot-v1-128k', name: 'Kimi K3 (128K)', context: 128000 },
      { id: 'moonshot-v1-32k', name: 'Kimi K3 (32K)', context: 32000 },
      { id: 'moonshot-v1-8k', name: 'Kimi K3 (8K)', context: 8000 }
    ]
  },
  qwen: {
    name: '阿里通义',
    default_base: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: [
      { id: 'qwen-max', name: 'Qwen3-Max', context: 32000 },
      { id: 'qwen-plus', name: 'Qwen3-Plus', context: 128000 },
      { id: 'qwen-turbo', name: 'Qwen3-Turbo', context: 1000000 }
    ]
  },
  custom: {
    name: '自定义',
    default_base: '',
    models: []
  }
}

// ============ 获取用户 AI 模型列表 ============
export function getUserModels(userId) {
  const models = db.prepare('SELECT * FROM quant_ai_models WHERE user_id = ? ORDER BY is_default DESC, created_at DESC').all(userId)
  return models.map(m => ({
    ...m,
    config: m.config ? (typeof m.config === 'string' ? JSON.parse(m.config) : m.config) : null
  }))
}

// ============ 获取默认模型 ============
export function getDefaultModel(userId) {
  const model = db.prepare('SELECT * FROM quant_ai_models WHERE user_id = ? AND is_default = 1 AND status = ?').get(userId, 'active')
  if (!model) {
    return db.prepare('SELECT * FROM quant_ai_models WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1').get(userId, 'active')
  }
  return model
}

// ============ 创建/更新 AI 模型 ============
export function createModel(userId, data) {
  const id = uuidv4()
  const provider = data.provider || 'custom'
  const apiBase = data.api_base || MODEL_PROVIDERS[provider]?.default_base || ''

  db.prepare(`
    INSERT INTO quant_ai_models (id, user_id, name, provider, model_id, api_key, api_base, temperature, max_tokens, status, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, userId, data.name, provider, data.model_id,
    data.api_key || '', apiBase,
    data.temperature ?? 0.3, data.max_tokens ?? 2000,
    data.status || 'inactive', data.is_default ? 1 : 0
  )

  return db.prepare('SELECT * FROM quant_ai_models WHERE id = ?').get(id)
}

export function updateModel(modelId, userId, data) {
  const fields = []
  const values = []

  const allowed = ['name', 'provider', 'model_id', 'api_key', 'api_base', 'temperature', 'max_tokens', 'status', 'is_default', 'last_error', 'last_tested_at']
  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`)
      values.push(data[key])
    }
  }

  if (fields.length === 0) return null

  // 如果设为默认，先取消其他默认
  if (data.is_default) {
    db.prepare('UPDATE quant_ai_models SET is_default = 0 WHERE user_id = ?').run(userId)
  }

  fields.push("updated_at = datetime('now', 'localtime')")
  values.push(modelId, userId)

  db.prepare(`UPDATE quant_ai_models SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values)

  return db.prepare('SELECT * FROM quant_ai_models WHERE id = ?').get(modelId)
}

export function deleteModel(modelId, userId) {
  db.prepare('DELETE FROM quant_ai_models WHERE id = ? AND user_id = ?').run(modelId, userId)
}

// ============ 测试模型连接 ============
export async function testModelConnection(modelId, userId) {
  const model = db.prepare('SELECT * FROM quant_ai_models WHERE id = ? AND user_id = ?').get(modelId, userId)
  if (!model) throw new Error('模型不存在')

  if (!model.api_key) {
    db.prepare(`UPDATE quant_ai_models SET status = 'error', last_error = 'API Key 未配置', last_tested_at = datetime('now', 'localtime') WHERE id = ?`).run(modelId)
    return { success: false, message: 'API Key 未配置' }
  }

  try {
    const startTime = Date.now()
    const response = await fetch(`${model.api_base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${model.api_key}`
      },
      body: JSON.stringify({
        model: model.model_id,
        messages: [{ role: 'user', content: 'Hello, respond with "OK" only.' }],
        max_tokens: 10,
        temperature: 0
      }),
      signal: AbortSignal.timeout(15000)
    })

    const latency = Date.now() - startTime

    if (!response.ok) {
      const errText = await response.text()
      const errMsg = `HTTP ${response.status}: ${errText.substring(0, 200)}`
      db.prepare(`UPDATE quant_ai_models SET status = 'error', last_error = ?, last_tested_at = datetime('now', 'localtime') WHERE id = ?`).run(errMsg, modelId)
      return { success: false, message: errMsg, latency_ms: latency }
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || ''

    db.prepare(`UPDATE quant_ai_models SET status = 'active', last_error = NULL, last_tested_at = datetime('now', 'localtime') WHERE id = ?`).run(modelId)

    return {
      success: true,
      message: '连接成功',
      latency_ms: latency,
      reply: reply.substring(0, 100),
      model: model.model_id
    }
  } catch (err) {
    const errMsg = err.name === 'TimeoutError' ? '请求超时（15s）' : err.message
    db.prepare(`UPDATE quant_ai_models SET status = 'error', last_error = ?, last_tested_at = datetime('now', 'localtime') WHERE id = ?`).run(errMsg, modelId)
    return { success: false, message: errMsg }
  }
}

// ============ 调用 AI 模型分析 ============
export async function callAIModel(modelId, userId, systemPrompt, userPrompt, options = {}) {
  const model = modelId
    ? db.prepare('SELECT * FROM quant_ai_models WHERE id = ? AND user_id = ?').get(modelId, userId)
    : getDefaultModel(userId)

  if (!model) {
    return {
      success: false,
      source: 'rule_engine',
      message: '未配置 AI 模型，使用规则引擎分析',
      analysis: null
    }
  }

  if (model.status !== 'active' || !model.api_key) {
    return {
      success: false,
      source: 'rule_engine',
      model_name: model.name,
      message: `模型 ${model.name} 未激活或未配置 Key，使用规则引擎分析`,
      analysis: null
    }
  }

  try {
    const startTime = Date.now()
    const response = await fetch(`${model.api_base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${model.api_key}`
      },
      body: JSON.stringify({
        model: model.model_id,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: options.temperature ?? model.temperature ?? 0.3,
        max_tokens: options.max_tokens ?? model.max_tokens ?? 2000,
        ...(options.stream && { stream: true })
      }),
      signal: AbortSignal.timeout(options.timeout || 30000)
    })

    const latency = Date.now() - startTime

    if (!response.ok) {
      const errText = await response.text()
      return {
        success: false,
        source: 'ai_model',
        model_name: model.name,
        message: `AI 调用失败: HTTP ${response.status}`,
        error: errText.substring(0, 500),
        latency_ms: latency,
        analysis: null
      }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    // 尝试解析 JSON
    let parsed = null
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1] || jsonMatch[0])
      }
    } catch {
      // 非 JSON，保留原文
    }

    return {
      success: true,
      source: 'ai_model',
      model_name: model.name,
      model_id: model.model_id,
      provider: model.provider,
      content,
      parsed,
      latency_ms: latency,
      tokens: data.usage
    }
  } catch (err) {
    return {
      success: false,
      source: 'ai_model',
      model_name: model.name,
      message: err.name === 'TimeoutError' ? 'AI 请求超时' : err.message,
      analysis: null
    }
  }
}

// ============ AI 策略分析系统提示词 ============
export const SYSTEM_PROMPTS = {
  strategy_design: `你是一个专业的量化交易策略设计师。基于给定的市场数据和用户需求，设计一个可被数据验证的量化交易策略。

你必须返回 JSON 格式，包含以下字段：
{
  "strategy_name": "策略名称",
  "strategy_type": "trend_following|mean_reversion|market_making|cross_model_arb|time_region_arb|forward_spot_arb|multi_strategy",
  "hypothesis": "可验证的假设描述",
  "entry_rules": ["入场规则1", "入场规则2"],
  "exit_rules": ["出场规则1", "出场规则2"],
  "risk_management": {
    "stop_loss": 0.05,
    "take_profit": 0.10,
    "max_position": 0.15,
    "max_leverage": 2.0
  },
  "parameters": {
    "lookback_period": 20,
    "signal_threshold": 0.7
  },
  "expected_behavior": "预期表现描述",
  "market_condition": "适合的市场环境（趋势/震荡/高波动）",
  "confidence": 0.8
}`,

  backtest_analysis: `你是一个量化交易回测分析师。分析回测结果，评估策略有效性。

返回 JSON 格式：
{
  "overall_assessment": "excellent|good|average|poor|failed",
  "strengths": ["优势1", "优势2"],
  "weaknesses": ["不足1", "不足2"],
  "risk_analysis": "风险分析",
  "optimization_suggestions": ["优化建议1", "优化建议2"],
  "market_fit": "策略适合的市场环境",
  "confidence_score": 0.8,
  "recommendation": "proceed|optimize|abandon",
  "reasoning": "详细推理过程"
}`,

  paper_trading_review: `你是一个模拟交易评审专家。比较模拟交易与回测结果的一致性。

返回 JSON 格式：
{
  "match_assessment": "high|medium|low",
  "match_rate": 0.85,
  "discrepancies": ["差异1", "差异2"],
  "slippage_analysis": "滑点影响分析",
  "latency_impact": "延迟影响分析",
  "risk_warnings": ["风险提示1"],
  "adjustment_needed": true,
  "adjustments": ["调整建议1"],
  "recommendation": "proceed_to_live|continue_paper|back_to_backtest",
  "confidence": 0.8
}`,

  live_monitoring: `你是一个实盘交易监控专家。分析实盘运行状况，提供持续优化建议。

返回 JSON 格式：
{
  "health_status": "healthy|warning|critical",
  "performance_vs_backtest": "consistent|slightly_off|diverging",
  "current_risks": ["当前风险1"],
  "anomalies": ["异常1"],
  "optimization_actions": ["优化行动1"],
  "position_adjustment": "increase|maintain|reduce|exit",
  "reasoning": "详细分析",
  "confidence": 0.8
}`,

  market_diagnosis: `你是一个 AI 模型算力市场的实时诊断专家。基于订单簿、技术指标和市场数据，提供实时诊断。

返回 JSON 格式：
{
  "market_sentiment": "bullish|bearish|neutral",
  "confidence": 0.8,
  "key_observations": ["观察1", "观察2"],
  "order_book_analysis": "订单簿分析",
  "technical_analysis": "技术面分析",
  "risk_alerts": [{"level": "warning", "message": "风险提示"}],
  "trading_signals": [{"action": "buy|sell|hold", "strength": "strong|medium|weak", "reason": "原因"}],
  "strategy_suggestion": "策略建议",
  "position_recommendation": "建议仓位"
}`
}

export default {
  MODEL_PROVIDERS,
  getUserModels,
  getDefaultModel,
  createModel,
  updateModel,
  deleteModel,
  testModelConnection,
  callAIModel,
  SYSTEM_PROMPTS
}
