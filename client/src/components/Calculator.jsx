import { useState } from 'react'
import { calculatorApi } from '../services/api'

function formatMoney(num) {
  if (num >= 100000000) return (num / 100000000).toFixed(2) + '亿'
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  return num.toString()
}

export default function Calculator() {
  const [form, setForm] = useState({
    company_type: 'ai',
    annual_compute_cost: 500,
    annual_token_cost: 200,
    ip_count: 5,
    region_beijing: true
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const runCalc = async () => {
    setLoading(true)
    try {
      const data = await calculatorApi.estimate(form)
      setResult(data)
    } catch (err) {
      alert(err.message)
    }
    setLoading(false)
  }

  return (
    <section className="section section-alt" id="calculator">
      <div className="container">
        <div className="section-header fade-up">
          <div className="section-tag"><i className="fas fa-circle"></i> 智能匹配</div>
          <h2 className="section-title dark">政策匹配 & 额度预估计算器</h2>
          <p className="section-desc">输入企业基本信息，即可查看可享受的政策和预估额度</p>
        </div>

        <div className="calc-wrap fade-up">
          <div className="calc-header">
            <h3>30秒快速测算你的企业能拿多少补贴</h3>
            <p>数据仅供参考，最终额度以银行与平台审核为准</p>
          </div>

          <div className="calc-grid">
            <div className="calc-form">
              <div className="calc-field">
                <label>企业类型 <span className="hint">（选择最符合的类型）</span></label>
                <select className="calc-select" value={form.company_type} onChange={e => setForm({...form, company_type: e.target.value})}>
                  <option value="ai">AI算力企业 / 大模型公司</option>
                  <option value="compute">智算集群建设企业</option>
                  <option value="opc">OPC（一人公司）创业者</option>
                  <option value="startup">大模型创业公司</option>
                </select>
              </div>
              <div className="calc-field">
                <label>年算力租赁费用 <span className="hint">（万元）</span></label>
                <div className="calc-input-row">
                  <input type="range" className="calc-slider" min="0" max="10000" value={form.annual_compute_cost} step="50" onChange={e => setForm({...form, annual_compute_cost: Number(e.target.value)})} />
                  <div className="calc-value">{form.annual_compute_cost}<span className="unit">万元</span></div>
                </div>
              </div>
              <div className="calc-field">
                <label>年Token/词元消耗费用 <span className="hint">（万元）</span></label>
                <div className="calc-input-row">
                  <input type="range" className="calc-slider" min="0" max="5000" value={form.annual_token_cost} step="10" onChange={e => setForm({...form, annual_token_cost: Number(e.target.value)})} />
                  <div className="calc-value">{form.annual_token_cost}<span className="unit">万元</span></div>
                </div>
              </div>
              <div className="calc-field">
                <label>自主知识产权数量 <span className="hint">（项，OPC贷增信用）</span></label>
                <div className="calc-input-row">
                  <input type="range" className="calc-slider" min="0" max="50" value={form.ip_count} step="1" onChange={e => setForm({...form, ip_count: Number(e.target.value)})} />
                  <div className="calc-value">{form.ip_count}<span className="unit">项</span></div>
                </div>
              </div>
              <div className="calc-field">
                <label>是否在北京注册或在亦庄有经营场所</label>
                <select className="calc-select" value={form.region_beijing ? 'yes' : 'no'} onChange={e => setForm({...form, region_beijing: e.target.value === 'yes'})}>
                  <option value="yes">是，在北京注册/亦庄经营</option>
                  <option value="no">否，需设立分支机构</option>
                </select>
              </div>
              <button className="calc-btn" onClick={runCalc} disabled={loading}>
                {loading ? '计算中...' : '立即测算'}
              </button>
            </div>

            <div className="calc-result">
              {!result ? (
                <div className="calc-result-empty">
                  <i className="fas fa-calculator"></i>
                  <p>填写左侧信息后点击"立即测算"<br/>即可查看匹配的政策与预估额度</p>
                </div>
              ) : !result.eligible ? (
                <>
                  <div className="calc-result-empty">
                    <i className="fas fa-info-circle"></i>
                    <p>{result.message}</p>
                  </div>
                  <a className="calc-cta" href="#guide" onClick={e => { e.preventDefault(); document.getElementById('guide')?.scrollIntoView({behavior:'smooth'}) }}>联系顾问，规划入驻方案</a>
                </>
              ) : result.matches.length === 0 ? (
                <div className="calc-result-empty">
                  <i className="fas fa-exclamation-circle"></i>
                  <p>{result.message}</p>
                </div>
              ) : (
                <>
                  {result.matches.map((m, i) => (
                    <div key={i} className="calc-match">
                      <div className="calc-match-title">
                        <i className={`fas ${m.icon}`}></i> {m.name}
                        {i === 0 && <span style={{fontSize:11, background:'rgba(6,182,212,0.2)', padding:'1px 6px', borderRadius:8}}>最佳匹配</span>}
                      </div>
                      <div className="calc-match-row"><span>{m.detail}</span><span className="val">{m.max}</span></div>
                      <div className="calc-match-row"><span>预估可获金额</span><span className="val">{m.subsidy > 0 ? formatMoney(m.subsidy) : '—'}</span></div>
                    </div>
                  ))}
                  {result.total > 0 && (
                    <div className="calc-total">
                      <span className="calc-total-label">预估总可获得金额</span>
                      <span className="calc-total-value">{formatMoney(result.total)}<span className="unit"> 元</span></span>
                    </div>
                  )}
                  <a className="calc-cta" href="#guide" onClick={e => { e.preventDefault(); document.getElementById('guide')?.scrollIntoView({behavior:'smooth'}) }}>立即申请，获取精准方案</a>
                </>
              )}
              {result?.disclaimer && <p className="calc-disclaimer">* {result.disclaimer}</p>}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
