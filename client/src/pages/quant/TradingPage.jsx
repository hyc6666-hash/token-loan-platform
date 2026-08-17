import { useState, useEffect } from 'react'
import { tradingApi, marketApi, strategyApi } from '../../services/api'

export default function TradingPage() {
  const [models, setModels] = useState([])
  const [regions, setRegions] = useState([])
  const [strategies, setStrategies] = useState([])
  const [portfolio, setPortfolio] = useState(null)
  const [orders, setOrders] = useState([])
  const [positions, setPositions] = useState([])
  const [trades, setTrades] = useState([])

  // 下单表单
  const [side, setSide] = useState('buy')
  const [modelCode, setModelCode] = useState('')
  const [region, setRegion] = useState('SG1')
  const [orderType, setOrderType] = useState('limit')
  const [price, setPrice] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [contractType, setContractType] = useState('firm')
  const [strategyId, setStrategyId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [ov, regs, pf, ords, poss, trs, strs] = await Promise.all([
        marketApi.getModels(),
        marketApi.getRegions(),
        tradingApi.getPortfolio(),
        tradingApi.getOrders({ limit: 20 }),
        tradingApi.getPositions(),
        tradingApi.getTrades({ limit: 20 }),
        strategyApi.list()
      ])
      setModels(ov)
      setRegions(regs)
      setPortfolio(pf)
      setOrders(ords)
      setPositions(poss)
      setTrades(trs)
      setStrategies(strs)
      if (ov[0]) {
        setModelCode(ov[0].code)
        setPrice(ov[0].base_price)
      }
    } catch (err) {
      console.error('Load error:', err)
    }
  }

  const onModelChange = async (code) => {
    setModelCode(code)
    try {
      const quote = await marketApi.getQuote(code, region)
      setPrice(quote.price)
    } catch (err) {
      console.error('Quote error:', err)
    }
  }

  const submitOrder = async () => {
    setSubmitting(true)
    setMessage(null)
    try {
      const result = await tradingApi.createOrder({
        model_code: modelCode,
        region,
        side,
        order_type: orderType,
        price: parseFloat(price),
        quantity: parseFloat(quantity),
        contract_type: contractType,
        strategy_id: strategyId || null,
        auto_fill: orderType === 'market'
      })
      if (result.success) {
        setMessage({ type: 'success', text: `订单创建成功！${result.warnings?.length ? '（有风控警告）' : ''}` })
        loadData()
      } else {
        setMessage({ type: 'error', text: result.message || '下单失败' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
    setSubmitting(false)
  }

  const cancelOrder = async (orderId) => {
    try {
      await tradingApi.cancelOrder(orderId)
      loadData()
    } catch (err) {
      console.error('Cancel error:', err)
    }
  }

  const closePos = async (positionId) => {
    if (!confirm('确认平仓？')) return
    try {
      const result = await tradingApi.closePosition(positionId)
      alert(`平仓成功！盈亏: ¥${result.realized_pnl.toFixed(2)} (${result.pnl_pct.toFixed(2)}%)`)
      loadData()
    } catch (err) {
      alert('平仓失败: ' + err.message)
    }
  }

  const orderValue = price * quantity

  return (
    <div className="quant-container">
      {/* 账户概览 */}
      <div className="quant-grid-4" style={{ marginBottom: 24 }}>
        <div className="quant-card quant-stat">
          <div className="quant-stat-value">¥{(portfolio?.summary?.total_capital || 0).toLocaleString()}</div>
          <div className="quant-stat-label">总资金</div>
        </div>
        <div className="quant-card quant-stat">
          <div className="quant-stat-value" style={{ color: 'var(--brand-600)' }}>
            ¥{(portfolio?.summary?.available_capital || 0).toLocaleString()}
          </div>
          <div className="quant-stat-label">可用资金</div>
        </div>
        <div className="quant-card quant-stat">
          <div className="quant-stat-value" style={{ color: 'var(--warning-fg)' }}>
            ¥{(portfolio?.summary?.frozen_capital || 0).toLocaleString()}
          </div>
          <div className="quant-stat-label">冻结资金</div>
        </div>
        <div className="quant-card quant-stat">
          <div className="quant-stat-value" style={{
            color: (portfolio?.summary?.total_unrealized_pnl || 0) >= 0 ? 'var(--success-fg)' : 'var(--danger-fg)'
          }}>
            {(portfolio?.summary?.total_unrealized_pnl || 0) >= 0 ? '+' : ''}¥{(portfolio?.summary?.total_unrealized_pnl || 0).toFixed(2)}
          </div>
          <div className="quant-stat-label">浮动盈亏</div>
        </div>
      </div>

      <div className="quant-grid-2" style={{ gridTemplateColumns: '380px 1fr' }}>
        {/* 下单表单 */}
        <div className="quant-card">
          <div className="quant-card-header">
            <div className="quant-card-title">💹 手动下单</div>
          </div>

          {message && (
            <div style={{
              padding: '10px 12px', borderRadius: 8, marginBottom: 12, fontSize: 13,
              background: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
              color: message.type === 'success' ? 'var(--success-fg)' : 'var(--danger-fg)'
            }}>
              {message.text}
            </div>
          )}

          <div className="trade-form">
            <div className="trade-side-toggle">
              <button
                className={`trade-side-btn buy ${side === 'buy' ? 'active' : ''}`}
                onClick={() => setSide('buy')}
              >
                买入 / 做多
              </button>
              <button
                className={`trade-side-btn sell ${side === 'sell' ? 'active' : ''}`}
                onClick={() => setSide('sell')}
              >
                卖出 / 做空
              </button>
            </div>

            <div className="trade-form-row">
              <div className="trade-input-group">
                <label className="trade-label">模型</label>
                <select className="trade-select" value={modelCode} onChange={e => onModelChange(e.target.value)}>
                  {models.map(m => <option key={m.code} value={m.code}>{m.code} - {m.name}</option>)}
                </select>
              </div>
              <div className="trade-input-group">
                <label className="trade-label">区域</label>
                <select className="trade-select" value={region} onChange={e => setRegion(e.target.value)}>
                  {regions.map(r => <option key={r.code} value={r.code}>{r.name} ({r.code})</option>)}
                </select>
              </div>
            </div>

            <div className="trade-form-row">
              <div className="trade-input-group">
                <label className="trade-label">订单类型</label>
                <select className="trade-select" value={orderType} onChange={e => setOrderType(e.target.value)}>
                  <option value="limit">限价单</option>
                  <option value="market">市价单</option>
                </select>
              </div>
              <div className="trade-input-group">
                <label className="trade-label">合约类型</label>
                <select className="trade-select" value={contractType} onChange={e => setContractType(e.target.value)}>
                  <option value="firm">Firm 固定</option>
                  <option value="protected">价格保护</option>
                </select>
              </div>
            </div>

            <div className="trade-form-row">
              <div className="trade-input-group">
                <label className="trade-label">价格 (CNY)</label>
                <input
                  type="number"
                  className="trade-input"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  disabled={orderType === 'market'}
                />
              </div>
              <div className="trade-input-group">
                <label className="trade-label">数量 (blocks)</label>
                <input
                  type="number"
                  className="trade-input"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  min="0.01"
                  step="0.01"
                />
              </div>
            </div>

            <div className="trade-input-group">
              <label className="trade-label">关联策略 (可选)</label>
              <select className="trade-select" value={strategyId} onChange={e => setStrategyId(e.target.value)}>
                <option value="">无关联策略</option>
                {strategies.map(s => <option key={s.id} value={s.id}>{s.name} ({s.type})</option>)}
              </select>
            </div>

            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '12px 16px', background: 'var(--surface)', borderRadius: 8
            }}>
              <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>订单价值</span>
              <span style={{ fontSize: 16, fontWeight: 700 }}>
                ¥{orderValue.toLocaleString()}
              </span>
            </div>

            <button
              className={`trade-submit-btn ${side}`}
              onClick={submitOrder}
              disabled={submitting || !modelCode || quantity <= 0}
            >
              {submitting ? '提交中...' : side === 'buy' ? '确认买入' : '确认卖出'}
            </button>
          </div>
        </div>

        {/* 持仓 + 订单 */}
        <div>
          {/* 持仓 */}
          <div className="quant-card" style={{ marginBottom: 16 }}>
            <div className="quant-card-header">
              <div className="quant-card-title">📋 当前持仓</div>
              <span className="quant-tag">{positions.length} 个持仓</span>
            </div>
            {positions.length === 0 ? (
              <div className="quant-empty">暂无持仓</div>
            ) : (
              <table className="positions-table">
                <thead>
                  <tr>
                    <th>模型</th><th>区域</th><th>方向</th><th>数量</th>
                    <th>均价</th><th>现价</th><th>浮盈</th><th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map(p => (
                    <tr key={p.id}>
                      <td>{p.model_code}</td>
                      <td>{p.region}</td>
                      <td>
                        <span className={`quant-tag ${p.side === 'long' ? 'risk-low' : 'risk-high'}`}>
                          {p.side === 'long' ? '多' : '空'}
                        </span>
                      </td>
                      <td>{p.quantity}</td>
                      <td>¥{p.avg_price.toLocaleString()}</td>
                      <td>¥{p.current_price.toLocaleString()}</td>
                      <td className={p.unrealized_pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}>
                        {p.unrealized_pnl >= 0 ? '+' : ''}¥{p.unrealized_pnl.toFixed(2)}
                        <br />
                        <span style={{ fontSize: 11 }}>({p.pnl_pct >= 0 ? '+' : ''}{p.pnl_pct.toFixed(2)}%)</span>
                      </td>
                      <td>
                        <button className="quant-btn quant-btn-danger" style={{ padding: '4px 12px', fontSize: 12 }}
                          onClick={() => closePos(p.id)}>
                          平仓
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* 订单 */}
          <div className="quant-card">
            <div className="quant-card-header">
              <div className="quant-card-title">📝 订单记录</div>
            </div>
            {orders.length === 0 ? (
              <div className="quant-empty">暂无订单</div>
            ) : (
              <table className="positions-table">
                <thead>
                  <tr>
                    <th>时间</th><th>模型</th><th>方向</th><th>类型</th>
                    <th>价格</th><th>数量</th><th>已成交</th><th>状态</th><th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td style={{ fontSize: 11 }}>{new Date(o.created_at).toLocaleString('zh-CN')}</td>
                      <td>{o.model_code}</td>
                      <td>
                        <span className={`quant-tag ${o.side === 'buy' ? 'risk-low' : 'risk-high'}`}>
                          {o.side === 'buy' ? '买' : '卖'}
                        </span>
                      </td>
                      <td>{o.order_type}</td>
                      <td>¥{o.price.toLocaleString()}</td>
                      <td>{o.quantity}</td>
                      <td>{o.filled_quantity}</td>
                      <td>
                        <span className={`quant-tag ${
                          o.status === 'filled' ? 'risk-low' :
                          o.status === 'cancelled' ? 'risk-high' :
                          o.status === 'partial' ? 'risk-medium' : ''
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td>
                        {(o.status === 'pending' || o.status === 'partial') && (
                          <button className="quant-btn quant-btn-secondary" style={{ padding: '2px 8px', fontSize: 11 }}
                            onClick={() => cancelOrder(o.id)}>
                            撤单
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
