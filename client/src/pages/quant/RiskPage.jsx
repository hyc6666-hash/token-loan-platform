import { useState, useEffect } from 'react'
import { riskApi } from '../../services/api'

export default function RiskPage() {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadDashboard()
    const interval = setInterval(loadDashboard, 30000) // 每30秒刷新
    return () => clearInterval(interval)
  }, [])

  const loadDashboard = async () => {
    try {
      const data = await riskApi.getDashboard()
      setDashboard(data)
    } catch (err) {
      console.error('Dashboard error:', err)
    }
  }

  const acknowledge = async (alertId) => {
    try {
      await riskApi.acknowledgeAlert(alertId)
      loadDashboard()
    } catch (err) {
      console.error('Ack error:', err)
    }
  }

  const updateRule = async (ruleId, field, value) => {
    try {
      await riskApi.updateRule(ruleId, { [field]: value })
      loadDashboard()
    } catch (err) {
      console.error('Update rule error:', err)
    }
  }

  const updateCapital = async (field, value) => {
    try {
      await riskApi.updateCapital({ [field]: value })
      loadDashboard()
    } catch (err) {
      console.error('Update capital error:', err)
    }
  }

  if (!dashboard) return <div className="quant-loading">加载风控数据中...</div>

  const { metrics, alerts, alert_stats, rules, positions, risk_score, risk_level, config } = dashboard

  const riskLevelConfig = {
    safe: { label: '安全', color: 'risk-level-safe', bg: 'var(--success-bg)' },
    low: { label: '低风险', color: 'risk-level-low', bg: '#ecfccb' },
    moderate: { label: '中等', color: 'risk-level-moderate', bg: 'var(--warning-bg)' },
    high: { label: '高风险', color: 'risk-level-high', bg: '#ffedd5' },
    extreme: { label: '极端', color: 'risk-level-extreme', bg: 'var(--danger-bg)' }
  }

  const rl = riskLevelConfig[risk_level] || riskLevelConfig.moderate

  return (
    <div className="quant-container">
      {/* 风控评分 */}
      <div className="quant-card" style={{ marginBottom: 24, background: rl.bg }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, color: 'var(--gray-600)' }}>整体风险评分</div>
            <div className={`risk-metric-value ${rl.color}`} style={{ fontSize: 48, margin: '4px 0' }}>
              {risk_score} / 100
            </div>
            <div style={{ fontSize: 16, fontWeight: 600 }} className={rl.color}>{rl.label}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>账户净值</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>¥{metrics.net_value?.toLocaleString()}</div>
            <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 8 }}>总敞口</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>¥{metrics.total_exposure?.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* 风控指标 */}
      <div className="risk-dashboard">
        <div className="risk-metric-card">
          <div className="risk-metric-label">敞口比例</div>
          <div className="risk-metric-value" style={{
            color: metrics.exposure_ratio > 0.8 ? 'var(--danger-fg)' :
                   metrics.exposure_ratio > 0.5 ? 'var(--warning-fg)' : 'var(--success-fg)'
          }}>
            {(metrics.exposure_ratio * 100).toFixed(1)}%
          </div>
          <div className="risk-metric-label">上限 {(config.max_total_exposure * 100).toFixed(0)}%</div>
        </div>
        <div className="risk-metric-card">
          <div className="risk-metric-label">浮动盈亏</div>
          <div className="risk-metric-value" style={{
            color: metrics.total_unrealized_pnl >= 0 ? 'var(--success-fg)' : 'var(--danger-fg)'
          }}>
            {metrics.total_unrealized_pnl >= 0 ? '+' : ''}¥{metrics.total_unrealized_pnl?.toFixed(2)}
          </div>
          <div className="risk-metric-label">占比 {(metrics.pnl_ratio * 100).toFixed(2)}%</div>
        </div>
        <div className="risk-metric-card">
          <div className="risk-metric-label">保证金占用</div>
          <div className="risk-metric-value">¥{metrics.total_margin?.toLocaleString()}</div>
          <div className="risk-metric-label">可用 ¥{metrics.available_capital?.toLocaleString()}</div>
        </div>
      </div>

      <div className="quant-grid-2">
        {/* 风控规则 */}
        <div className="quant-card">
          <div className="quant-card-header">
            <div className="quant-card-title">🛡️ 风控规则</div>
            <button className="quant-btn quant-btn-secondary" style={{ fontSize: 12, padding: '4px 12px' }}
              onClick={loadDashboard}>
              刷新
            </button>
          </div>
          <div className="risk-rules-list">
            {rules.map(rule => (
              <div key={rule.id} className={`risk-rule-item ${rule.status === 'breached' ? 'breached' : rule.status === 'warning' ? 'warning' : ''}`}>
                <div className="risk-rule-info">
                  <div className="risk-rule-name">{rule.rule_type.replace(/_/g, ' ')}</div>
                  <div className="risk-rule-desc">
                    阈值: {(rule.threshold * 100).toFixed(1)}% · 当前: {(rule.current_value * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="risk-rule-bar">
                  <div
                    className="risk-rule-bar-fill"
                    style={{
                      width: `${Math.min(100, rule.utilization * 100)}%`,
                      background: rule.status === 'breached' ? 'var(--danger-icon)' :
                                 rule.status === 'warning' ? 'var(--warning-icon)' : 'var(--success-icon)'
                    }}
                  />
                </div>
                <span className={`risk-rule-status status-${rule.status === 'breached' ? 'breached' : rule.status === 'warning' ? 'warning' : 'normal'}`}>
                  {rule.status === 'breached' ? '超限' : rule.status === 'warning' ? '警告' : '正常'}
                </span>
              </div>
            ))}
          </div>

          {/* 资金配置编辑 */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div className="trade-label" style={{ marginBottom: 8 }}>资金配置</div>
            <div className="trade-form-row">
              <div className="trade-input-group">
                <label className="trade-label">总资金 (CNY)</label>
                <input
                  type="number"
                  className="trade-input"
                  defaultValue={config.total_capital}
                  onBlur={e => updateCapital('total_capital', parseFloat(e.target.value))}
                />
              </div>
              <div className="trade-input-group">
                <label className="trade-label">风险偏好</label>
                <select
                  className="trade-select"
                  defaultValue={config.risk_tolerance}
                  onChange={e => updateCapital('risk_tolerance', e.target.value)}
                >
                  <option value="conservative">保守</option>
                  <option value="moderate">稳健</option>
                  <option value="aggressive">激进</option>
                  <option value="extreme">极端</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 风控告警 */}
        <div className="quant-card">
          <div className="quant-card-header">
            <div className="quant-card-title">⚠️ 风控告警</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {alert_stats.critical > 0 && <span className="quant-tag risk-high">{alert_stats.critical} 严重</span>}
              {alert_stats.warning > 0 && <span className="quant-tag risk-medium">{alert_stats.warning} 警告</span>}
              {alert_stats.breach > 0 && <span className="quant-tag" style={{ background: '#7c2d12', color: '#fff' }}>{alert_stats.breach} 违约</span>}
            </div>
          </div>

          {alerts.length === 0 ? (
            <div className="quant-empty">
              <p>✅ 无风控告警</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>所有风控指标正常</p>
            </div>
          ) : (
            alerts.map(alert => (
              <div key={alert.id} className={`risk-alert alert-${alert.severity}`}>
                <div className="risk-alert-content">
                  <div className="risk-alert-title">{alert.title}</div>
                  <div className="risk-alert-message">{alert.message}</div>
                  <div className="risk-alert-time">
                    {new Date(alert.created_at).toLocaleString('zh-CN')}
                  </div>
                </div>
                {!alert.acknowledged && (
                  <button className="quant-btn quant-btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }}
                    onClick={() => acknowledge(alert.id)}>
                    确认
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 持仓风控视图 */}
      <div className="quant-card" style={{ marginTop: 16 }}>
        <div className="quant-card-header">
          <div className="quant-card-title">📊 持仓风控视图</div>
        </div>
        {positions.length === 0 ? (
          <div className="quant-empty">暂无持仓</div>
        ) : (
          <table className="positions-table">
            <thead>
              <tr>
                <th>模型</th><th>方向</th><th>数量</th><th>均价</th>
                <th>现价</th><th>浮盈</th><th>保证金</th><th>风险占比</th>
              </tr>
            </thead>
            <tbody>
              {positions.map(p => {
                const riskRatio = config.total_capital > 0 ? (p.quantity * p.current_price / config.total_capital) * 100 : 0
                return (
                  <tr key={p.id}>
                    <td>{p.model_code}</td>
                    <td>
                      <span className={`quant-tag ${p.side === 'long' ? 'risk-low' : 'risk-high'}`}>
                        {p.side === 'long' ? '多' : '空'}
                      </span>
                    </td>
                    <td>{p.quantity}</td>
                    <td>¥{p.avg_price?.toLocaleString()}</td>
                    <td>¥{p.current_price?.toLocaleString()}</td>
                    <td className={p.unrealized_pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}>
                      {p.unrealized_pnl >= 0 ? '+' : ''}¥{p.unrealized_pnl?.toFixed(2)}
                    </td>
                    <td>¥{p.margin?.toLocaleString()}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="risk-rule-bar" style={{ width: 80 }}>
                          <div className="risk-rule-bar-fill" style={{
                            width: `${Math.min(100, riskRatio)}%`,
                            background: riskRatio > 40 ? 'var(--danger-icon)' :
                                       riskRatio > 20 ? 'var(--warning-icon)' : 'var(--success-icon)'
                          }} />
                        </div>
                        <span style={{ fontSize: 12 }}>{riskRatio.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
