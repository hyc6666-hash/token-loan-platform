import { useEffect, useRef } from 'react'

function Counter({ target, decimals = 0 }) {
  const ref = useRef(null)
  const animated = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !animated.current) {
        animated.current = true
        const duration = 2000
        const start = performance.now()
        function update(now) {
          const progress = Math.min((now - start) / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          const current = target * eased
          ref.current.textContent = decimals ? current.toFixed(1) : Math.floor(current)
          if (progress < 1) requestAnimationFrame(update)
        }
        requestAnimationFrame(update)
      }
    }, { threshold: 0.15 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target, decimals])

  return <span className="counter" ref={ref}>0</span>
}

export default function Hero() {
  return (
    <section className="hero" id="home">
      <div className="hero-particles">
        {[6,4,8,5,3,7].map((s, i) => (
          <div key={i} className="hero-particle" style={{width:`${s}px`,height:`${s}px`,left:`${[10,30,60,80,45,90][i]}%`,top:`${[20,50,30,60,75,15][i]}%`,animationDelay:`${i*0.8}s`}} />
        ))}
      </div>
      <div className="hero-grid"></div>
      <div className="container hero-content">
        <div className="hero-badge"><i className="fas fa-circle"></i> 2026年最新政策 · 即时更新</div>
        <h1 className="hero-title">北京Token贷 · 词元金融服务平台</h1>
        <p className="hero-subtitle">服务北京AI算力企业 ｜ 助力<span>词元经济</span>高质量发展</p>
        <p style={{fontSize:15, color:'var(--text-muted)', marginBottom:8}}>由 <span style={{color:'var(--cyan)', fontWeight:600}}>Kai 企业模型服务容量市场</span> 提供TPM数据基础设施支持</p>

        <div className="hero-dashboard fade-up">
          <div className="dash-card">
            <div className="dash-icon purple"><i className="fas fa-microchip"></i></div>
            <div className="dash-number"><Counter target={1.4} decimals={1} /><span className="unit">万亿/日</span></div>
            <div className="dash-label">北京词元工厂日产能</div>
          </div>
          <div className="dash-card">
            <div className="dash-icon blue"><i className="fas fa-ticket-alt"></i></div>
            <div className="dash-number"><Counter target={1} /><span className="unit">亿元/年</span></div>
            <div className="dash-label">算力券 + 数据券</div>
          </div>
          <div className="dash-card">
            <div className="dash-icon cyan"><i className="fas fa-coins"></i></div>
            <div className="dash-number"><Counter target={1} /><span className="unit">亿元/年</span></div>
            <div className="dash-label">词元券（模型券）</div>
          </div>
          <div className="dash-card">
            <div className="dash-icon amber"><i className="fas fa-building"></i></div>
            <div className="dash-number"><Counter target={500} /><span className="unit">+</span></div>
            <div className="dash-label">OPC社区服务主体</div>
          </div>
        </div>

        <div className="hero-entries fade-up">
          <a href="#products" className="entry-card" onClick={e => { e.preventDefault(); document.getElementById('products')?.scrollIntoView({behavior:'smooth'}) }}>
            <div className="entry-icon product"><i className="fas fa-cube"></i></div>
            <div className="entry-title">产品中心</div>
            <div className="entry-desc">Token贷 / 算力贷 / OPC贷三大金融产品，依托Kai TPM数据精准匹配AI企业融资需求</div>
            <span className="entry-arrow"><i className="fas fa-arrow-right"></i></span>
          </a>
          <a href="#policy" className="entry-card" onClick={e => { e.preventDefault(); document.getElementById('policy')?.scrollIntoView({behavior:'smooth'}) }}>
            <div className="entry-icon policy"><i className="fas fa-chart-line"></i></div>
            <div className="entry-title">政策解读</div>
            <div className="entry-desc">词元十条 · 智能体发展措施 · OPC行动方案 —— 北京词元经济政策全景</div>
            <span className="entry-arrow"><i className="fas fa-arrow-right"></i></span>
          </a>
          <a href="#guide" className="entry-card" onClick={e => { e.preventDefault(); document.getElementById('guide')?.scrollIntoView({behavior:'smooth'}) }}>
            <div className="entry-icon apply"><i className="fas fa-paper-plane"></i></div>
            <div className="entry-title">立即申请</div>
            <div className="entry-desc">5步极速申请，在线预约专属金融服务顾问，快速启动融资流程</div>
            <span className="entry-arrow"><i className="fas fa-arrow-right"></i></span>
          </a>
        </div>
      </div>
    </section>
  )
}
