import { useState } from 'react'

const mapData = [
  { name: '壹号词元工厂', color: '#06b6d4', desc: '北京首座词元工厂，位于亦庄核心区。日产能突破1.4万亿词元，打造词元经济"超级入口"。作为Kai认证容量供应商，提供标准化模型服务能力。' },
  { name: '京算词元工厂', color: '#0891b2', desc: '北京首家国资词元工厂，亦庄点亮运营。具备国资背景的词元生产基地，同样作为Kai认证容量供应商参与市场。' },
  { name: 'Kai 容量市场交易中心', color: '#22d3ee', desc: 'TPM期货交易核心枢纽。提供统一API、交易组织、容量路由、计量和结算管理。连接模型发布商、容量供应商、企业买家和聚合商。' },
  { name: '模数OPC社区', color: '#0e7490', desc: '超4万平米OPC社区，服务超500家OPC（一人公司）主体。Kai聚合商入驻，为中小OPC创业者批量采购TPM容量并以子账户分配。' },
  { name: '"即用即补"模型券兑现平台', color: '#155e75', desc: '词元经济超级入口，对接Kai交付确认数据。企业可在此申请算力券（30%补贴最高2000万）和词元券（50%支持最高500万）。' },
  { name: '北京智算集群', color: '#164e63', desc: '算力基础设施核心节点，Kai容量注册来源。为词元工厂和模型服务提供底层算力支撑，行云科技在此获超百亿授信建设。' }
]

const markers = [
  { cx: 180, cy: 180, color: '#06b6d4' },
  { cx: 380, cy: 160, color: '#0891b2' },
  { cx: 290, cy: 250, color: '#22d3ee' },
  { cx: 430, cy: 310, color: '#0e7490' },
  { cx: 150, cy: 330, color: '#155e75' },
  { cx: 470, cy: 380, color: '#164e63' },
]

const labels = [
  { x: 190, y: 178, text: '壹号词元工厂', sub: '北京首座 · 日产1.4万亿词元' },
  { x: 390, y: 158, text: '京算词元工厂', sub: '首家国资词元工厂' },
  { x: 300, y: 248, text: 'Kai容量市场交易中心', sub: 'TPM期货 · 价格发现 · 结算' },
  { x: 440, y: 308, text: '模数OPC社区', sub: '4万m² · 500+主体' },
  { x: 160, y: 328, text: '"即用即补"兑现平台', sub: '词元经济超级入口' },
  { x: 480, y: 378, text: '北京智算集群', sub: '算力基础设施 · Kai容量注册' },
]

export default function About() {
  const [popup, setPopup] = useState(null)

  return (
    <section className="section section-alt section-bg bg-about section-bg-bl" id="about">
      <div className="shell-content">
        <div className="section-header fade-up">
          <div className="section-tag"><i className="fas fa-circle"></i> 关于我们</div>
          <h2 className="section-title">平台定位与合作生态</h2>
          <p className="section-desc">连接金融机构与AI企业，构建词元经济金融服务基础设施</p>
        </div>

        <div className="about-grid fade-up">
          <div className="about-text">
            <h3>平台定位</h3>
            <p>北京Token贷 · 词元金融服务平台是面向北京AI算力企业、大模型创业公司及OPC创业者的综合性金融服务门户。平台依托北京市"词元十条"等专项政策，整合Token贷、算力贷、OPC贷等金融产品，为企业提供一站式融资解决方案。</p>
            <p>平台深度对接亦庄词元工厂的Token消耗数据，实现数据驱动的精准授信，助力北京词元经济高质量发展。</p>
            <div style={{ marginTop: 'var(--space-5)', padding: 'var(--space-4)', background: 'var(--surface)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--primary)' }}>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--primary)' }}>技术合作方 · Kai</strong> —— 本平台由 Kai 企业模型服务容量市场提供TPM（每分钟令牌负载）数据支持，为Token贷额度核定提供客观、可验证的消耗数据基础。
              </p>
            </div>
            <div className="partners-section">
              <div className="partners-label">拟合作银行机构</div>
              <div className="partners-grid">
                {['中国银行', '招商银行', '中信银行', '工商银行', '建设银行', '更多银行...'].map(b => (
                  <div key={b} className="partner-slot"><span className="bank-name">{b}</span></div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="map-card">
              <div className="map-title">北京词元经济产业地图 · 亦庄核心区</div>
              <div className="map-legend">
                <div className="map-legend-item"><div className="map-legend-dot" style={{ background: '#06b6d4' }}></div> 词元工厂</div>
                <div className="map-legend-item"><div className="map-legend-dot" style={{ background: '#22d3ee' }}></div> 交易/结算中心</div>
                <div className="map-legend-item"><div className="map-legend-dot" style={{ background: '#0e7490' }}></div> OPC/兑现平台</div>
              </div>
              <div className="map-svg-wrap">
                <div className="map-svg-inner">
                <svg className="map-svg" viewBox="0 0 600 500" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="mapBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#020617' }} />
                      <stop offset="50%" style={{ stopColor: '#0f172a' }} />
                      <stop offset="100%" style={{ stopColor: '#164e63' }} />
                    </linearGradient>
                    <pattern id="gridPattern" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                    </pattern>
                    <filter id="mapGlow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                  </defs>
                  <rect width="600" height="500" fill="url(#mapBgGrad)" />
                  <rect width="600" height="500" fill="url(#gridPattern)" />
                  <text x="300" y="30" textAnchor="middle" fontSize="13" fill="rgba(255,255,255,0.3)" fontWeight="500">北京经济技术开发区 · 亦庄</text>
                  <path d="M 80 120 Q 150 80 220 100 L 300 70 Q 380 85 460 110 L 530 90 L 560 140 L 540 200 L 560 280 L 520 360 L 460 400 L 380 420 L 280 440 L 180 420 L 100 380 L 60 300 L 50 200 L 80 120 Z" fill="rgba(6,182,212,0.06)" stroke="rgba(6,182,212,0.2)" strokeWidth="1" strokeDasharray="4 3" />
                  <line x1="180" y1="180" x2="290" y2="250" stroke="rgba(6,182,212,0.15)" strokeWidth="1" strokeDasharray="3 2" />
                  <line x1="380" y1="160" x2="290" y2="250" stroke="rgba(6,182,212,0.15)" strokeWidth="1" strokeDasharray="3 2" />
                  <line x1="290" y1="250" x2="430" y2="310" stroke="rgba(6,182,212,0.1)" strokeWidth="1" strokeDasharray="3 2" />
                  <line x1="290" y1="250" x2="150" y2="330" stroke="rgba(6,182,212,0.1)" strokeWidth="1" strokeDasharray="3 2" />
                  <line x1="290" y1="250" x2="470" y2="380" stroke="rgba(6,182,212,0.1)" strokeWidth="1" strokeDasharray="3 2" />
                  {markers.map((m, i) => (
                    <g key={i} className="map-marker" style={{ cursor: 'pointer' }} onClick={() => setPopup(i)}>
                      <circle className="map-marker-ring" cx={m.cx} cy={m.cy} r="6" fill={m.color} opacity="0.3" />
                      <circle className="map-marker-dot" cx={m.cx} cy={m.cy} r="5" fill={m.color} filter="url(#mapGlow)" />
                      <text className="map-marker-label" x={labels[i].x} y={labels[i].y}>{labels[i].text}</text>
                      <text className="map-marker-label-sub" x={labels[i].x} y={labels[i].y + 12}>{labels[i].sub}</text>
                    </g>
                  ))}
                  <text x="300" y="470" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.15)">点击标记点查看详情 · 虚线表示生态关联</text>
                </svg>
                </div>
                {popup !== null && (
                  <div className="map-popup show" style={{ left: markers[popup].cx > 350 ? markers[popup].cx - 280 : markers[popup].cx + 12, top: markers[popup].cy - 10 }}>
                    <button className="map-popup-close" onClick={() => setPopup(null)}><i className="fas fa-times"></i></button>
                    <div className="map-popup-title">
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: mapData[popup].color }}></span> {mapData[popup].name}
                    </div>
                    <div className="map-popup-desc">{mapData[popup].desc}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
