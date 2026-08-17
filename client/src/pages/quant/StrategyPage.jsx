import { useState, useEffect } from 'react'
import { strategyApi } from '../../services/api'

export default function StrategyPage() {
  const [strategies, setStrategies] = useState([])
  const [types, setTypes] = useState([])
  const [signals, setSignals] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [strs, tys] = await Promise.all([
        strategyApi.list(),
        strategyApi.getTypes()
      ])
      setStrategies(strs)
      setTypes(tys)
    } catch (err) {
      console.error('Load error:', err)
    }
  }

  const createStrategy = async (typeDef) => {
    try {
      const config = {}
      typeDef.params.forEach(p => { config[p.key] = p.default })
      await strategyApi.create({
        name: typeDef.name,
        type: typeDef.type,
        config,
        allocated_capital: 0,
        status: 'draft',
        auto_execute: false
      })
      loadData()
    } catch (err) {
      alert('创建失败: ' + err.message)
    }
  }

  const toggleStrategy = async (strategy) => {
    try {
      const newStatus = strategy.status === 'active' ? 'paused' : 'active'
      await strategyApi.update(strategy.id, { status: newStatus })
      loadData()
    } catch (err) {
      alert('更新失败: ' + err.message)
    }
  }

  const deleteStrategy = async (id) => {
    if (!confirm('确认删除此策略？')) return
    try {
      await strategyApi.delete(id)
      loadData()
    } catch (err) {
      alert('删除失败: ' + err.message)
    }
  }

  const generateSigs = async (strategyId) => {
    setLoading(true)
    try {
      const result = await strategyApi.generateSignals(strategyId)
      setSignals({ ...signals, [strategyId]: result.signals })
    } catch (err) {
      alert('信号生成失败: ' + err.message)
    }
    setLoading(false)
  }

  const loadSigs = async (strategyId) => {
    try {
      const sigs = await strategyApi.getSignals(strategyId, 10)
      setSignals({ ...signals, [strategyId]: sigs })
    } catch (err) {
      console.error('Signals error:', err)
    }
  }

  return (
    <div className="quant-container">
      {/* 策略类型库 */}
      <div className="quant-card" style={{ marginBottom: 24 }}>
        <div className="quant-card-header">
          <div>
            <div className="quant-card-title">🎯 策略库</div>
            <div className="quant-card-subtitle">6大策略类型，点击创建</div>
          </div>
        </div>
        <div className="strategy-grid">
          {types.map(t => (
            <div key={t.type} className="strategy-card">
              <div className="strategy-card-header">
                <div className="strategy-card-name">{t.name}</div>
                <span className={`strategy-card-type risk-${t.risk_level}`}>
                  {t.risk_level === 'low' ? '低风险' : t.risk_level === 'medium' ? '中风险' : '高风险'}
                </span>
              </div>
              <div className="strategy-card-desc">{t.description}</div>
              <div className="strategy-card-stats">
                <div className="strategy-stat">
                  <div className="strategy-stat-value">{t.expected_return}</div>
                  <div className="strategy-stat-label">预期收益</div>
                </div>
                <div className="strategy-stat">
                  <div className="strategy-stat-value">¥{(t.min_capital / 10000).toFixed(0)}万+</div>
                  <div className="strategy-stat-label">最低资金</div>
                </div>
              </div>
              <button className="quant-btn" style={{ width: '100%' }} onClick={() => createStrategy(t)}>
                创建策略
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 我的策略 */}
      <div className="quant-card">
        <div className="quant-card-header">
          <div className="quant-card-title">📋 我的策略</div>
          <span className="quant-tag">{strategies.length} 个策略</span>
        </div>

        {strategies.length === 0 ? (
          <div className="quant-empty">
            <p>暂无策略，请从上方策略库创建</p>
            <p style={{ fontSize: 12, marginTop: 8 }}>
              或前往 <a href="/quant/dashboard" style={{ color: 'var(--brand-600)' }}>仪表盘</a> 获取AI推荐
            </p>
          </div>
        ) : (
          <div className="strategy-grid">
            {strategies.map(s => (
              <div key={s.id} className="strategy-card">
                <div className="strategy-card-header">
                  <div>
                    <div className="strategy-card-name">{s.name}</div>
                    {s.ai_recommended && <span className="quant-tag" style={{ background: 'var(--brand-50)', color: 'var(--brand-700)' }}>AI推荐</span>}
                  </div>
                  <span className={`quant-tag ${
                    s.status === 'active' ? 'risk-low' :
                    s.status === 'paused' ? 'risk-medium' :
                    s.status === 'stopped' ? 'risk-high' : ''
                  }`}>
                    {s.status}
                  </span>
                </div>

                <div className="strategy-card-desc">
                  类型: {s.type}<br />
                  分配资金: ¥{(s.allocated_capital || 0).toLocaleString()}<br />
                  预期收益: {s.expected_return || 'N/A'}%
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <button
                    className={`quant-btn ${s.status === 'active' ? 'quant-btn-secondary' : ''}`}
                    style={{ flex: 1, fontSize: 12, padding: '6px 8px' }}
                    onClick={() => toggleStrategy(s)}
                  >
                    {s.status === 'active' ? '暂停' : '启动'}
                  </button>
                  <button
                    className="quant-btn quant-btn-secondary"
                    style={{ flex: 1, fontSize: 12, padding: '6px 8px' }}
                    onClick={() => generateSigs(s.id)}
                    disabled={loading}
                  >
                    生成信号
                  </button>
                  <button
                    className="quant-btn quant-btn-secondary"
                    style={{ fontSize: 12, padding: '6px 8px' }}
                    onClick={() => loadSigs(s.id)}
                  >
                    查看信号
                  </button>
                </div>

                <button
                  className="quant-btn quant-btn-danger"
                  style={{ width: '100%', fontSize: 12, padding: '6px 8px' }}
                  onClick={() => deleteStrategy(s.id)}
                >
                  删除
                </button>

                {/* 信号展示 */}
                {signals[s.id] && signals[s.id].length > 0 && (
                  <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                    <div className="trade-label" style={{ marginBottom: 8 }}>最新信号</div>
                    {signals[s.id].slice(0, 3).map((sig, i) => (
                      <div key={i} style={{
                        padding: '8px 10px', borderRadius: 6, marginBottom: 4,
                        background: sig.signal_type === 'buy' ? 'var(--success-bg)' :
                                   sig.signal_type === 'sell' ? 'var(--danger-bg)' : 'var(--surface)',
                        fontSize: 12
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong>{sig.signal_type.toUpperCase()}</strong>
                          <span>¥{sig.price?.toLocaleString()}</span>
                        </div>
                        <div style={{ color: 'var(--gray-600)', marginTop: 4, fontSize: 11 }}>
                          {sig.reasoning}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
