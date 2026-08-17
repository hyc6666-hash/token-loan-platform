import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { marketApi, strategyApi, riskApi, tradingApi } from '../../services/api'
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

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [ov, rd, pf, ts] = await Promise.all([
        marketApi.getOverview(),
        riskApi.getDashboard().catch(() => null),
        tradingApi.getPortfolio().catch(() => null),
        strategyApi.getTiers()
      ])
      setOverview(ov)
      setRiskDashboard(rd)
      setPortfolio(pf)
      setTiers(ts)
    } catch (err) {
      console.error('Load error:', err)
    }
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
      // 更新风控配置
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
    { key: 'conservative', label: '保守型', icon: '🛡️', desc: '低风险低收益' },
    { key: 'moderate', label: '稳健型', icon: '⚖️', desc: '风险收益均衡' },
    { key: 'aggressive', label: '激进型', icon: '🚀', desc: '高风险高收益' },
    { key: 'extreme', label: '极端型', icon: '⚡', desc: '最大风险承受' }
  ]

  const currentTier = tiers.find(t => capital >= t.range[0] && capital < t.range[1]) || tiers[0]

  return (
    <div className="quant-container">
      {/* 头部统计 */}
      <div className="quant-grid-4" style={{ marginBottom: 24 }}>
        <div className="quant-card quant-stat">
          <div className="quant-stat-value" style={{ color: 'var(--brand-600)' }}>
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
          <div className="quant-stat-value" style={{ color: riskDashboard ? `var(--${riskDashboard.risk_level === 'safe' || riskDashboard.risk_level === 'low' ? 'success' : riskDashboard.risk_level === 'moderate' ? 'warning' : 'danger'}-fg)` : 'var(--gray-500)' }}>
            {riskDashboard?.risk_score || 0}
          </div>
          <div className="quant-stat-label">风险评分</div>
        </div>
        <div className="quant-card quant-stat">
          <div className="quant-stat-value" style={{ color: 'var(--brand-600)' }}>
            ¥{portfolio ? (portfolio.summary.net_value / 10000).toFixed(2) : '0'}万
          </div>
          <div className="quant-stat-label">账户净值</div>
        </div>
      </div>

      {/* 资金选择 + AI推荐 */}
      <div className="quant-grid-2" style={{ marginBottom: 24 }}>
        <div className="quant-card">
          <div className="quant-card-header">
            <div>
              <div className="quant-card-title">💰 资金配置</div>
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
                    <div className="pref-icon">{pref.icon}</div>
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
              {loading ? '🤖 AI分析中...' : '🤖 获取AI策略推荐'}
            </button>
          </div>
        </div>

        {/* AI推荐结果 */}
        <div className="ai-advisor-panel">
          <div className="ai-advisor-header">
            <div className="ai-advisor-icon">🤖</div>
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
                <div className="trade-label" style={{ marginBottom: 8 }}>🛡️ 风控体系</div>
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
                <div className="trade-label" style={{ marginBottom: 8 }}>⚠️ 应急预案</div>
                {recommendation.risk_control.emergency_protocols.map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: 6,
                    background: p.priority === 'critical' ? 'var(--danger-bg)' : 'var(--warning-bg)',
                    marginBottom: 4, fontSize: 13
                  }}>
                    <span>{p.trigger}</span>
                    <strong>{p.action}</strong>
                  </div>
                ))}
              </div>

              <button className="quant-btn" onClick={applyRecommendation} style={{ width: '100%' }}>
                ✅ 应用推荐策略和风控配置
              </button>
            </>
          )}
        </div>
      </div>

      {/* 快速导航 */}
      <div className="quant-grid-4">
        <Link to="/quant/market" className="quant-card" style={{ textDecoration: 'none', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
          <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>行情中心</div>
          <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>实时报价 · K线图 · 技术指标</div>
        </Link>
        <Link to="/quant/trading" className="quant-card" style={{ textDecoration: 'none', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>💹</div>
          <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>交易终端</div>
          <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>手动下单 · 持仓管理 · 订单记录</div>
        </Link>
        <Link to="/quant/strategy" className="quant-card" style={{ textDecoration: 'none', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
          <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>策略管理</div>
          <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>多策略引擎 · 信号生成 · 回测</div>
        </Link>
        <Link to="/quant/risk" className="quant-card" style={{ textDecoration: 'none', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🛡️</div>
          <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>风控中心</div>
          <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>实时监控 · 告警管理 · 规则配置</div>
        </Link>
      </div>
    </div>
  )
}
