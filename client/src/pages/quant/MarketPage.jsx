import { useState, useEffect, useRef } from 'react'
import { marketApi } from '../../services/api'

export default function MarketPage() {
  const [models, setModels] = useState([])
  const [quotes, setQuotes] = useState([])
  const [selectedModel, setSelectedModel] = useState(null)
  const [candles, setCandles] = useState([])
  const [indicators, setIndicators] = useState(null)
  const [timeframe, setTimeframe] = useState('1h')
  const [region, setRegion] = useState('SG1')
  const [regions, setRegions] = useState([])
  const [forwards, setForwards] = useState([])
  const [tab, setTab] = useState('spot') // spot | forward
  const canvasRef = useRef(null)

  useEffect(() => {
    loadInitial()
  }, [])

  useEffect(() => {
    if (selectedModel) {
      loadCandles()
      loadIndicators()
    }
  }, [selectedModel, timeframe, region])

  const loadInitial = async () => {
    try {
      const [ov, regs, fwd] = await Promise.all([
        marketApi.getOverview(),
        marketApi.getRegions(),
        marketApi.getForwards()
      ])
      setModels(ov.models)
      setQuotes(ov.quotes)
      setRegions(regs)
      setForwards(fwd)
      if (ov.models[0]) setSelectedModel(ov.models[0].code)
    } catch (err) {
      console.error('Load error:', err)
    }
  }

  const loadCandles = async () => {
    try {
      const data = await marketApi.getCandles(selectedModel, region, timeframe, 100)
      setCandles(data)
      drawChart(data)
    } catch (err) {
      console.error('Candles error:', err)
    }
  }

  const loadIndicators = async () => {
    try {
      const data = await marketApi.getIndicators(selectedModel, region, timeframe)
      setIndicators(data.indicators)
    } catch (err) {
      console.error('Indicators error:', err)
    }
  }

  const refreshQuotes = async () => {
    try {
      const data = await marketApi.getQuotes(region)
      setQuotes(data)
    } catch (err) {
      console.error('Refresh error:', err)
    }
  }

  // 简易K线图绘制
  const drawChart = (data) => {
    const canvas = canvasRef.current
    if (!canvas || !data.length) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width = canvas.offsetWidth * 2
    const H = canvas.height = 400 * 2
    ctx.scale(2, 2)
    const w = W / 2, h = H / 2

    ctx.clearRect(0, 0, w, h)

    const padding = { top: 20, right: 60, bottom: 30, left: 10 }
    const chartW = w - padding.left - padding.right
    const chartH = h - padding.top - padding.bottom

    const prices = data.flatMap(d => [d.high, d.low])
    const minP = Math.min(...prices)
    const maxP = Math.max(...prices)
    const range = maxP - minP || 1

    const candleW = chartW / data.length * 0.7
    const step = chartW / data.length

    // 网格线
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartH / 5) * i
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(w - padding.right, y)
      ctx.stroke()

      const price = maxP - (range / 5) * i
      ctx.fillStyle = '#94a3b8'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('¥' + Math.round(price), w - padding.right + 4, y + 3)
    }

    // K线
    data.forEach((c, i) => {
      const x = padding.left + step * i + step / 2
      const openY = padding.top + ((maxP - c.open) / range) * chartH
      const closeY = padding.top + ((maxP - c.close) / range) * chartH
      const highY = padding.top + ((maxP - c.high) / range) * chartH
      const lowY = padding.top + ((maxP - c.low) / range) * chartH

      const isUp = c.close >= c.open
      ctx.strokeStyle = isUp ? '#22c55e' : '#ef4444'
      ctx.fillStyle = isUp ? '#22c55e' : '#ef4444'

      // 影线
      ctx.beginPath()
      ctx.moveTo(x, highY)
      ctx.lineTo(x, lowY)
      ctx.stroke()

      // 实体
      const bodyTop = Math.min(openY, closeY)
      const bodyH = Math.max(1, Math.abs(closeY - openY))
      ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH)
    })
  }

  useEffect(() => {
    if (candles.length) drawChart(candles)
  }, [candles])

  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d']

  return (
    <div className="quant-container">
      <div className="quant-grid-2" style={{ gridTemplateColumns: '320px 1fr' }}>
        {/* 行情列表 */}
        <div className="quant-card" style={{ padding: 0 }}>
          <div className="quant-card-header" style={{ padding: '16px 20px' }}>
            <div className="quant-card-title">📊 模型行情</div>
            <button onClick={refreshQuotes} className="quant-btn" style={{ padding: '4px 12px', fontSize: 12 }}>
              刷新
            </button>
          </div>
          <div style={{ padding: '0 8px 8px' }}>
            <select className="trade-select" value={region} onChange={e => setRegion(e.target.value)} style={{ width: '100%', marginBottom: 8 }}>
              {regions.map(r => <option key={r.code} value={r.code}>{r.name} ({r.code})</option>)}
            </select>
          </div>
          <div>
            {quotes.map(q => (
              <div
                key={q.model_code}
                className="market-quote-row"
                onClick={() => setSelectedModel(q.model_code)}
                style={selectedModel === q.model_code ? { background: 'var(--brand-50)' } : {}}
              >
                <div className="market-quote-model">
                  <div className="market-quote-name">{q.model_code}</div>
                  <div className="market-quote-provider">{q.provider}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="market-quote-price">¥{q.price.toLocaleString()}</div>
                  <div className={`market-quote-change ${q.change_pct_24h >= 0 ? 'pnl-positive' : 'pnl-negative'}`}>
                    {q.change_pct_24h >= 0 ? '+' : ''}{q.change_pct_24h.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* K线图 + 指标 */}
        <div>
          <div className="quant-card" style={{ marginBottom: 16 }}>
            <div className="chart-toolbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 18, fontWeight: 700 }}>{selectedModel}</span>
                {quotes.find(q => q.model_code === selectedModel) && (
                  <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--brand-600)' }}>
                    ¥{quotes.find(q => q.model_code === selectedModel).price.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="chart-timeframes">
                {timeframes.map(tf => (
                  <button
                    key={tf}
                    className={`chart-tf-btn ${timeframe === tf ? 'active' : ''}`}
                    onClick={() => setTimeframe(tf)}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
            <div className="candle-chart" style={{ height: 400 }}>
              <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
            </div>
          </div>

          {/* 技术指标 */}
          {indicators && (
            <div className="quant-card">
              <div className="quant-card-header">
                <div className="quant-card-title">📈 技术指标</div>
              </div>
              <div className="quant-grid-4">
                <div className="quant-stat">
                  <div className="quant-stat-value" style={{
                    color: indicators.rsi > 70 ? 'var(--danger-fg)' : indicators.rsi < 30 ? 'var(--success-fg)' : 'var(--foreground)'
                  }}>
                    {indicators.rsi}
                  </div>
                  <div className="quant-stat-label">RSI (14)</div>
                </div>
                <div className="quant-stat">
                  <div className="quant-stat-value" style={{
                    color: indicators.macd_histogram >= 0 ? 'var(--success-fg)' : 'var(--danger-fg)'
                  }}>
                    {indicators.macd_histogram}
                  </div>
                  <div className="quant-stat-label">MACD柱</div>
                </div>
                <div className="quant-stat">
                  <div className="quant-stat-value">{indicators.bollinger?.upper}</div>
                  <div className="quant-stat-label">布林上轨</div>
                </div>
                <div className="quant-stat">
                  <div className="quant-stat-value">{indicators.bollinger?.lower}</div>
                  <div className="quant-stat-label">布林下轨</div>
                </div>
              </div>
              <div className="quant-grid-3" style={{ marginTop: 12 }}>
                <div className="quant-stat">
                  <div className="quant-stat-value" style={{ fontSize: 16 }}>MA5: {indicators.ma?.ma5}</div>
                </div>
                <div className="quant-stat">
                  <div className="quant-stat-value" style={{ fontSize: 16 }}>MA10: {indicators.ma?.ma10}</div>
                </div>
                <div className="quant-stat">
                  <div className="quant-stat-value" style={{ fontSize: 16 }}>MA20: {indicators.ma?.ma20}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 远期合约 */}
      {tab === 'forward' && (
        <div className="quant-card" style={{ marginTop: 16 }}>
          <div className="quant-card-header">
            <div className="quant-card-title">📅 远期合约</div>
          </div>
          <table className="positions-table">
            <thead>
              <tr>
                <th>模型</th><th>交割月</th><th>远期价格</th><th>现货价格</th>
                <th>基差</th><th>基差%</th><th>成交量</th>
              </tr>
            </thead>
            <tbody>
              {forwards.map((f, i) => (
                <tr key={i}>
                  <td>{f.model_code}</td>
                  <td>{f.delivery_month}</td>
                  <td>¥{f.forward_price.toLocaleString()}</td>
                  <td>¥{f.spot_price.toLocaleString()}</td>
                  <td className={f.basis >= 0 ? 'pnl-positive' : 'pnl-negative'}>
                    {f.basis >= 0 ? '+' : ''}¥{f.basis.toLocaleString()}
                  </td>
                  <td className={f.basis >= 0 ? 'pnl-positive' : 'pnl-negative'}>
                    {f.basis >= 0 ? '+' : ''}{f.basis_pct}%
                  </td>
                  <td>{f.volume.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button className={`quant-btn ${tab === 'spot' ? '' : 'quant-btn-secondary'}`} onClick={() => setTab('spot')}>
          现货行情
        </button>
        <button className={`quant-btn ${tab === 'forward' ? '' : 'quant-btn-secondary'}`} onClick={() => setTab('forward')}>
          远期合约
        </button>
      </div>
    </div>
  )
}
