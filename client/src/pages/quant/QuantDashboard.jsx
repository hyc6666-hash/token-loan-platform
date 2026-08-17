import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { marketApi, strategyApi, riskApi, tradingApi, aiApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function QuantDashboard() {
  const { user } = useAuth()
  const [capital, setCapital] = useState(100000)
  const [riskPref, setRiskPref] = useState('moderate')
  const [recommendation, setRecommendation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [overview, setOverview] = useState(null)
  const [riskDashboard, setRiskDashboard] = useState(null)
  const [portfolio, setPortfolio] = useState(null)
  const [tiers, setTiers] = useState([])

  // AI 诊断状态
  const [diagnosis, setDiagnosis] = useState(null)
  const [diagnosisLoading, setDiagnosisLoading] = useState(false)
  const [liveMarket, setLiveMarket] = useState(null)
  const [sentiment, setSentiment] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    loadData()
    loadLiveMarket()
    loadSentiment()
  }, [])

  // 自动刷新实时数据
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      loadLiveMarket()
    }, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  const loadData = async () => {
    try {
      const [ov, rd, pf, ts] = await Promise.all([
        marketApi.getOverview().catch(() => null),
        riskApi.getDashboard().catch(() => null),
        tradingApi.getPortfolio().catch(() => null),
        strategyApi.getTiers().catch(() => [])
      ])
      setOverview(ov)
      setRiskDashboard(rd)
      setPortfolio(pf)
      setTiers(ts)
    } catch (err) {
      console.error('Load error:', err)
    }
  }

  const loadLiveMarket = useCallback(async () => {
    try {
      const data = await aiApi.getMarketData()
      if (data?.success) setLiveMarket(data.data)
    } catch (err) {
      // 静默失败
    }
  }, [])

  const loadSentiment = useCallback(async () => {
    try {
      const data = await aiApi.getSentiment()
      if (data?.success) setSentiment(data.data)
    } catch (err) {
      // 静默失败
    }
  }, [])

  const runDiagnosis = async () => {
    setDiagnosisLoading(true)
    try {
      const result = await aiApi.getDiagnosis({
        model: 'GLM-5.2',
        capital,
        riskPreference: riskPref
      })
      if (result?.success) {
        setDiagnosis(result.data)
        loadSentiment()
      }
    } catch (err) {
      console.error('Diagnosis error:', err)
    }
    setDiagnosisLoading(false)
  }

  const getAIRecommendation = async () => {
    setLoading(true)
    try {
      const rec = await strategyApi.aiRecommend(capital, riskPref)
      setRecommendation(rec)
    } catch (err) {
      console.error('AI recommend error:', err)
    }
    setLoading(false)
  }

  const applyRecommendation = async () => {
    if (!recommendation) return
    try {
      for (const strategy of recommendation.recommended_strategies) {
        await strategyApi.create({
          name: strategy.name,
          type: strategy.type,
          config: strategy.params,
          allocated_capital: strategy.allocated_capital,
          expected_return: parseFloat(strategy.expected_return) || 0,
          status: 'draft',
          auto_execute: false,
          ai_recommended: true
        })
      }
      await riskApi.updateCapital({
        total_capital: capital,
        risk_tolerance: riskPref,
        max_single_position: recommendation.risk_control.max_single_position,
        max_total_exposure: recommendation.risk_control.max_total_exposure,
        daily_loss_limit: recommendation.risk_control.daily_loss_limit,
        max_drawdown: recommendation.risk_control.max_drawdown
      })
      alert('策略和风控配置已应用！')
    } catch (err) {
      console.error('Apply error:', err)
      alert('应用失败: ' + err.message)
    }
  }

  const riskPrefs = [
    { key: 'conservative', label: '保守型', icon: 'fa-shield', desc: '低风险低收益' },
    { key: 'moderate', label: '稳健型', icon: 'fa-scale-balanced', desc: '风险收益均衡' },
    { key: 'aggressive', label: '激进型', icon: 'fa-rocket', desc: '高风险高收益' },
    { key: 'extreme', label: '极端型', icon: 'fa-bolt', desc: '最大风险承受' }
  ]

  const currentTier = tiers.find(t => capital >= t.range[0] && capital < t.range[1]) || tiers[0]

  const sentimentLabel = (s) => {
    const map = { strong_bullish: '强烈看多', bullish: '偏多', neutral: '中性', bearish: '偏空', strong_bearish: '强烈看空', insufficient_data: '数据不足' }
    return map[s] || '未知'
  }

  const sentimentColor = (s) => {
    if (s?.includes('bullish')) return 'var(--success-fg)'
    if (s?.includes('bearish')) return 'var(--danger-fg)'
    return 'var(--text-tertiary)'
  }

  return (
    <div className="quant-container">
      {/* 头部统计 */}
      <div className="quant-grid-4" style={{ marginBottom: 24 }}>
        <div className="quant-card quant-stat">
          <div className="quant-stat-value" style={{ color: 'var(--primary)' }}>
            {overview?.summary?.total_models || 4}
          </div>
          <div className="quant-stat-label">交易模型</div>
        </div>
        <div className="quant-card quant-stat">
          <div className="quant-stat-value" style={{ color: 'var(--success-fg)' }}>
            ¥{overview ? (overview.summary.total_value_24h / 10000).toFixed(1) : '0'}万
          </div>
          <div className="quant-stat-label">24H成交额</div>
        </div>
        <div className="quant-card quant-stat">
          <div className="quant-stat-value" style={{ color: riskDashboard ? `var(--${riskDashboard.risk_level === 'safe' || riskDashboard.risk_level === 'low' ? 'success' : riskDashboard.risk_level === 'moderate' ? 'warning' : 'danger'}-fg)` : 'var(--text-muted)' }}>
            {riskDashboard?.risk_score || 0}
          </div>
          <div className="quant-stat-label">风险评分</div>
        </div>
        <div className="quant-card quant-stat">
          <div className="quant-stat-value" style={{ color: 'var(--primary)' }}>
            ¥{portfolio ? (portfolio.summary.net_value / 10000).toFixed(2) : '0'}万
          </div>
          <div className="quant-stat-label">账户净值</div>
        </div>
      </div>

      {/* 实时 AI 诊断面板 */}
      <div className="quant-card" style={{ marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div className="quant-card-header">
          <div>
            <div className="quant-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fa-solid fa-brain" style={{ color: 'var(--primary)' }} />
              实时 AI 诊断引擎
            </div>
            <div className="quant-card-subtitle">
              基于 hongkong.kai.com 实时行情 · 订单簿分析 · 技术指标 · 策略调整
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {liveMarket && (
              <span style={{
                fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)',
                textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>
                <span className="quant-status-dot" style={{ display: 'inline-block', marginRight: 4 }} />
                {liveMarket.source === 'scraped' ? 'LIVE' : liveMarket.source === 'cache' ? 'CACHED' : 'SIMULATED'}
              </span>
            )}
            <button
              className="quant-btn quant-btn-secondary"
              onClick={() => setAutoRefresh(!autoRefresh)}
              style={{ fontSize: 11, padding: '4px 12px' }}
            >
              <i className={`fa-solid ${autoRefresh ? 'fa-pause' : 'fa-play'}`} />
              {autoRefresh ? '暂停' : '自动'}
            </button>
            <button
              className="quant-btn"
              onClick={runDiagnosis}
              disabled={diagnosisLoading}
              style={{ fontSize: 12, padding: '4px 16px' }}
            >
              {diagnosisLoading ? (
                <><i className="fa-solid fa-spinner fa-spin" /> 诊断中...</>
              ) : (
                <><i className="fa-solid fa-stethoscope" /> 执行诊断</>
              )}
            </button>
          </div>
        </div>

        {/* 实时行情数据条 */}
        {liveMarket && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 16
          }}>
            <div style={{ padding: '8px 16px', borderRight: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>最新价</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                {liveMarket.latestPrice?.toFixed(1)}
              </div>
            </div>
            <div style={{ padding: '8px 16px', borderRight: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>价差</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                {liveMarket.spread?.toFixed(1)}
              </div>
            </div>
            <div style={{ padding: '8px 16px', borderRight: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>买盘深度</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--success-fg)' }}>
                {liveMarket.orderBookDepth?.bidVolume || 0}
              </div>
            </div>
            <div style={{ padding: '8px 16px', borderRight: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>卖盘深度</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--danger-fg)' }}>
                {liveMarket.orderBookDepth?.askVolume || 0}
              </div>
            </div>
            <div style={{ padding: '8px 16px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>买卖压力</div>
              <div style={{
                fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)',
                color: liveMarket.orderBookDepth?.pressure === 'buy' ? 'var(--success-fg)' :
                       liveMarket.orderBookDepth?.pressure === 'sell' ? 'var(--danger-fg)' : 'var(--text-tertiary)'
              }}>
                {liveMarket.orderBookDepth?.pressure === 'buy' ? '买盘占优' :
                 liveMarket.orderBookDepth?.pressure === 'sell' ? '卖盘占优' : '均衡'}
                {' '}
                ({((liveMarket.orderBookDepth?.imbalance || 0) * 100).toFixed(0)}%)
              </div>
            </div>
          </div>
        )}

        {/* 诊断结果 */}
        {diagnosis ? (
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16,
              padding: 12, background: 'var(--background)', borderLeft: '2px solid var(--primary)'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>综合诊断</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {diagnosis.diagnosis?.summary?.recommendation || '观望'}
                  <span style={{
                    marginLeft: 12, fontSize: 12, fontFamily: 'var(--font-mono)',
                    color: sentimentColor(diagnosis.diagnosis?.summary?.overallSentiment)
                  }}>
                    {sentimentLabel(diagnosis.diagnosis?.summary?.overallSentiment)}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>置信度</div>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                  {((diagnosis.diagnosis?.summary?.confidence || 0) * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            <div className="quant-grid-3" style={{ marginBottom: 16 }}>
              <div className="quant-card" style={{ padding: 12 }}>
                <div className="trade-label" style={{ marginBottom: 8 }}>
                  <i className="fa-solid fa-list-check" /> 诊断项
                </div>
                {diagnosis.diagnosis?.items?.slice(0, 4).map((item, i) => (
                  <div key={i} style={{ marginBottom: 8, fontSize: 12 }}>
                    <span style={{
                      display: 'inline-block', padding: '1px 6px', marginRight: 6,
                      fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                      color: item.level === 'warning' ? 'var(--warning-fg)' : 'var(--info-fg)',
                      border: `1px solid ${item.level === 'warning' ? 'var(--warning-border)' : 'var(--info-border)'}`
                    }}>
                      {item.category}
                    </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.title}</span>
                    <div style={{ color: 'var(--text-tertiary)', marginTop: 2 }}>{item.detail}</div>
                  </div>
                ))}
              </div>

              <div className="quant-card" style={{ padding: 12 }}>
                <div className="trade-label" style={{ marginBottom: 8 }}>
                  <i className="fa-solid fa-signal" /> 交易信号
                </div>
                <div style={{
                  display: 'flex', gap: 8, marginBottom: 8,
                  padding: 8, background: 'var(--background)', justifyContent: 'center'
                }}>
                  <span style={{ color: 'var(--success-fg)', fontFamily: 'var(--font-mono)' }}>
                    买 {diagnosis.signals?.buyCount || 0}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    持 {diagnosis.signals?.holdCount || 0}
                  </span>
                  <span style={{ color: 'var(--danger-fg)', fontFamily: 'var(--font-mono)' }}>
                    卖 {diagnosis.signals?.sellCount || 0}
                  </span>
                </div>
                {diagnosis.signals?.items?.slice(0, 3).map((sig, i) => (
                  <div key={i} style={{ fontSize: 12, marginBottom: 6 }}>
                    <span style={{
                      color: sig.action === 'buy' ? 'var(--success-fg)' :
                             sig.action === 'sell' ? 'var(--danger-fg)' : 'var(--text-tertiary)',
                      fontWeight: 600, fontFamily: 'var(--font-mono)', textTransform: 'uppercase'
                    }}>
                      {sig.action}
                    </span>
                    <span style={{ color: 'var(--text-tertiary)', marginLeft: 8 }}>{sig.reason}</span>
                  </div>
                ))}
              </div>

              <div className="quant-card" style={{ padding: 12 }}>
                <div className="trade-label" style={{ marginBottom: 8 }}>
                  <i className="fa-solid fa-triangle-exclamation" /> 风险预警
                </div>
                {diagnosis.alerts?.length > 0 ? diagnosis.alerts.slice(0, 3).map((alert, i) => (
                  <div key={i} style={{
                    marginBottom: 8, padding: 8,
                    borderLeft: `2px solid ${alert.level === 'critical' ? 'var(--danger-icon)' :
                      alert.level === 'warning' ? 'var(--warning-icon)' : 'var(--info-icon)'}`,
                    background: 'var(--background)'
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{alert.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{alert.message}</div>
                    <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 4 }}>
                      <i className="fa-solid fa-arrow-right" style={{ fontSize: 9 }} /> {alert.action}
                    </div>
                  </div>
                )) : (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>
                    <i className="fa-solid fa-check" style={{ color: 'var(--success-fg)' }} /> 无风险预警
                  </div>
                )}
              </div>
            </div>

            {diagnosis.strategyAdjustments?.length > 0 && (
              <div>
                <div className="trade-label" style={{ marginBottom: 8 }}>
                  <i className="fa-solid fa-sliders" /> 策略调整建议
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {diagnosis.strategyAdjustments.map((adj, i) => (
                    <div key={i} style={{
                      padding: '6px 12px', border: '1px solid var(--border)',
                      background: 'var(--background)', fontSize: 12
                    }}>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                        {adj.strategy}
                      </span>
                      <span style={{ color: 'var(--text-tertiary)', margin: '0 6px' }}>→</span>
                      <span style={{ color: 'var(--text-primary)' }}>{adj.action.replace(/_/g, ' ')}</span>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{adj.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sentiment && (
              <div style={{
                marginTop: 12, padding: '8px 12px', background: 'var(--background)',
                display: 'flex', alignItems: 'center', gap: 12, fontSize: 12
              }}>
                <span style={{ color: 'var(--text-muted)' }}>情绪趋势:</span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontWeight: 600,
                  color: sentimentColor(sentiment.trend)
                }}>
                  {sentimentLabel(sentiment.trend)}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  (多 {sentiment.bullish || 0} / 空 {sentiment.bearish || 0} / 共 {sentiment.total || 0})
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="quant-empty">
            <i className="fa-solid fa-brain" style={{ fontSize: 32, color: 'var(--text-muted)', marginBottom: 8 }} />
            <p>点击"执行诊断"获取实时 AI 市场诊断</p>
            <p style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)' }}>
              系统将分析订单簿深度、技术指标、买卖压力，生成交易信号和策略调整建议
            </p>
          </div>
        )}
      </div>

      {/* 资金选择 + AI推荐 */}
      <div className="quant-grid-2" style={{ marginBottom: 24 }}>
        <div className="quant-card">
          <div className="quant-card-header">
            <div>
              <div className="quant-card-title">
                <i className="fa-solid fa-coins" style={{ color: 'var(--primary)' }} /> 资金配置
              </div>
              <div className="quant-card-subtitle">选择您的资金体量，AI将推荐合适策略</div>
            </div>
          </div>

          <div className="capital-selector">
            <div className="capital-input-group">
              <input
                type="number"
                className="capital-input"
                value={capital}
                onChange={(e) => setCapital(Math.max(0, parseInt(e.target.value) || 0))}
                min="0"
                step="10000"
              />
              <span className="capital-currency">CNY</span>
            </div>

            <div className="capital-tiers">
              {tiers.map(tier => (
                <div
                  key={tier.key}
                  className={`capital-tier-card ${currentTier?.key === tier.key ? 'active' : ''}`}
                  onClick={() => setCapital(tier.range[0] + (tier.key === 'large' ? 0 : 1))}
                >
                  <div className="tier-label">{tier.label}</div>
                  <div className="tier-range">{tier.range_label}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="trade-label" style={{ marginBottom: 8 }}>风险偏好</div>
              <div className="risk-pref-selector">
                {riskPrefs.map(pref => (
                  <div
                    key={pref.key}
                    className={`risk-pref-card ${riskPref === pref.key ? 'active' : ''}`}
                    onClick={() => setRiskPref(pref.key)}
                  >
                    <div className="pref-icon"><i className={`fa-solid ${pref.icon}`} /></div>
                    <div className="pref-label">{pref.label}</div>
                    <div className="pref-desc">{pref.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <button
              className="quant-btn"
              onClick={getAIRecommendation}
              disabled={loading || capital <= 0}
              style={{ marginTop: 8 }}
            >
              {loading ? (
                <><i className="fa-solid fa-spinner fa-spin" /> AI分析中...</>
              ) : (
                <><i className="fa-solid fa-robot" /> 获取AI策略推荐</>
              )}
            </button>
          </div>
        </div>

        <div className="ai-advisor-panel">
          <div className="ai-advisor-header">
            <div className="ai-advisor-icon"><i className="fa-solid fa-robot" /></div>
            <div>
              <div className="ai-advisor-title">AI 策略顾问</div>
              <div className="ai-advisor-subtitle">基于资金体量和风险偏好的智能推荐</div>
            </div>
          </div>

          {!recommendation ? (
            <div className="quant-empty">
              <p>配置资金和风险偏好后，点击"获取AI策略推荐"</p>
              <p style={{ fontSize: 12, marginTop: 8 }}>
                AI将分析您的资金规模，推荐最优策略组合和风控体系
              </p>
            </div>
          ) : (
            <>
              <div className="ai-summary">{recommendation.summary}</div>

              <div className="quant-grid-3" style={{ marginBottom: 16 }}>
                <div className="quant-stat">
                  <div className="quant-stat-value" style={{ color: 'var(--success-fg)', fontSize: 18 }}>
                    {recommendation.expected_annual_return.annual_return_pct}
                  </div>
                  <div className="quant-stat-label">预期年化收益</div>
                </div>
                <div className="quant-stat">
                  <div className="quant-stat-value" style={{ color: 'var(--danger-fg)', fontSize: 18 }}>
                    ¥{(recommendation.max_estimated_loss / 10000).toFixed(1)}万
                  </div>
                  <div className="quant-stat-label">最大估算亏损</div>
                </div>
                <div className="quant-stat">
                  <div className="quant-stat-value" style={{ fontSize: 18 }}>
                    {recommendation.sharpe_estimate}
                  </div>
                  <div className="quant-stat-label">夏普比率估算</div>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div className="trade-label" style={{ marginBottom: 8 }}>推荐策略组合</div>
                <div className="strategy-grid">
                  {recommendation.recommended_strategies.map((s, i) => (
                    <div key={i} className="strategy-card">
                      <div className="strategy-card-header">
                        <div className="strategy-card-name">{s.name}</div>
                        <span className={`strategy-card-type risk-${s.risk_level}`}>
                          {s.risk_level === 'low' ? '低风险' : s.risk_level === 'medium' ? '中风险' : '高风险'}
                        </span>
                      </div>
                      <div className="strategy-card-desc">{s.description}</div>
                      <div className="strategy-card-stats">
                        <div className="strategy-stat">
                          <div className="strategy-stat-value">¥{(s.allocated_capital / 10000).toFixed(1)}万</div>
                          <div className="strategy-stat-label">分配资金</div>
                        </div>
                        <div className="strategy-stat">
                          <div className="strategy-stat-value">{s.expected_return}</div>
                          <div className="strategy-stat-label">预期收益</div>
                        </div>
                      </div>
                      <div className="strategy-card-reasoning">{s.ai_reasoning}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div className="trade-label" style={{ marginBottom: 8 }}>
                  <i className="fa-solid fa-shield-halved" /> 风控体系
                </div>
                <div className="risk-rules-list">
                  {recommendation.risk_control.rules.slice(0, 5).map((rule, i) => (
                    <div key={i} className="risk-rule-item">
                      <div className="risk-rule-info">
                        <div className="risk-rule-name">{rule.rule_type.replace(/_/g, ' ')}</div>
                        <div className="risk-rule-desc">{rule.description}</div>
                      </div>
                      <span className={`risk-rule-status status-${rule.severity === 'critical' ? 'warning' : 'normal'}`}>
                        {rule.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div className="trade-label" style={{ marginBottom: 8 }}>
                  <i className="fa-solid fa-triangle-exclamation" /> 应急预案
                </div>
                {recommendation.risk_control.emergency_protocols.map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: p.priority === 'critical' ? 'var(--danger-bg)' : 'var(--warning-bg)',
                    marginBottom: 4, fontSize: 13
                  }}>
                    <span>{p.trigger}</span>
                    <strong>{p.action}</strong>
                  </div>
                ))}
              </div>

              <button className="quant-btn" onClick={applyRecommendation} style={{ width: '100%' }}>
                <i className="fa-solid fa-check" /> 应用推荐策略和风控配置
              </button>
            </>
          )}
        </div>
      </div>

      {/* 快速导航 */}
      <div className="quant-grid-4">
        <Link to="/quant/market" className="quant-card" style={{ textDecoration: 'none', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}><i className="fa-solid fa-chart-line" style={{ color: 'var(--primary)' }} /></div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>行情中心</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>实时报价 · K线图 · 技术指标</div>
        </Link>
        <Link to="/quant/trading" className="quant-card" style={{ textDecoration: 'none', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}><i className="fa-solid fa-arrows-rotate" style={{ color: 'var(--primary)' }} /></div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>交易终端</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>手动下单 · 持仓管理 · 订单记录</div>
        </Link>
        <Link to="/quant/strategy" className="quant-card" style={{ textDecoration: 'none', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}><i className="fa-solid fa-bullseye" style={{ color: 'var(--primary)' }} /></div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>策略管理</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>多策略引擎 · 信号生成 · 回测</div>
        </Link>
        <Link to="/quant/risk" className="quant-card" style={{ textDecoration: 'none', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}><i className="fa-solid fa-shield-halved" style={{ color: 'var(--primary)' }} /></div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>风控中心</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>实时监控 · 告警管理 · 规则配置</div>
        </Link>
      </div>
    </div>
  )
}
