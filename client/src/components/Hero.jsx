import { useEffect, useRef } from 'react'

/**
 * Counter - 数字滚动动画
 * Kai UI 规范：数字使用等宽数字 + tabular-nums
 */
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
          // 十进制字符串格式化，不经过 number 隐式转换
          ref.current.textContent = decimals ? current.toFixed(decimals) : Math.floor(current).toString()
          if (progress < 1) requestAnimationFrame(update)
        }
        requestAnimationFrame(update)
      }
    }, { threshold: 0.15 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target, decimals])

  return <span className="counter mono" ref={ref}>0</span>
}

export default function Hero() {
  return (
    <section className="hero" id="home">
      <div className="shell-content">
        <div className="hero-badge">
          <i className="fas fa-circle"></i> 2026年最新政策 · 即时更新
        </div>
        <h1 className="hero-title">北京Token贷 · 词元金融服务平台</h1>
        <p className="hero-subtitle">服务北京AI算力企业 ｜ 助力<span>词元经济</span>高质量发展</p>
        <p style={{ fontSize: 15, color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)' }}>
          由 <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Kai 企业模型服务容量市场</span> 提供TPM数据基础设施支持
        </p>

        {/* Dashboard - 等宽数字 + 十进制精度 */}
        <div className="dashboard-grid fade-up">
          <div className="dash-card">
            <div className="dash-icon dash-icon-primary"><i className="fas fa-microchip"></i></div>
            <div className="dash-number"><Counter target={1.4} decimals={1} /><span className="unit">万亿/日</span></div>
            <div className="dash-label">北京词元工厂日产能</div>
          </div>
          <div className="dash-card">
            <div className="dash-icon dash-icon-info"><i className="fas fa-ticket-alt"></i></div>
            <div className="dash-number"><Counter target={1} /><span className="unit">亿元/年</span></div>
            <div className="dash-label">算力券 + 数据券</div>
          </div>
          <div className="dash-card">
            <div className="dash-icon dash-icon-success"><i className="fas fa-coins"></i></div>
            <div className="dash-number"><Counter target={1} /><span className="unit">亿元/年</span></div>
            <div className="dash-label">词元券（模型券）</div>
          </div>
          <div className="dash-card">
            <div className="dash-icon dash-icon-warning"><i className="fas fa-building"></i></div>
            <div className="dash-number"><Counter target={500} /><span className="unit">+</span></div>
            <div className="dash-label">OPC社区服务主体</div>
          </div>
        </div>

        {/* Entry Cards */}
        <div className="products-grid fade-up" style={{ marginTop: 'var(--space-10)' }}>
          <a href="#products" className="card card-hover" style={{ textDecoration: 'none', padding: 'var(--space-8) var(--space-6)' }} onClick={e => { e.preventDefault(); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }) }}>
            <div className="dash-icon dash-icon-primary" style={{ margin: '0 0 var(--space-4) 0' }}><i className="fas fa-cube"></i></div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>产品中心</div>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>Token贷 / 算力贷 / OPC贷三大金融产品，依托Kai TPM数据精准匹配AI企业融资需求</div>
          </a>
          <a href="#policy" className="card card-hover" style={{ textDecoration: 'none', padding: 'var(--space-8) var(--space-6)' }} onClick={e => { e.preventDefault(); document.getElementById('policy')?.scrollIntoView({ behavior: 'smooth' }) }}>
            <div className="dash-icon dash-icon-info" style={{ margin: '0 0 var(--space-4) 0' }}><i className="fas fa-chart-line"></i></div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>政策解读</div>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>词元十条 · 智能体发展措施 · OPC行动方案 —— 北京词元经济政策全景</div>
          </a>
          <a href="#guide" className="card card-hover" style={{ textDecoration: 'none', padding: 'var(--space-8) var(--space-6)' }} onClick={e => { e.preventDefault(); document.getElementById('guide')?.scrollIntoView({ behavior: 'smooth' }) }}>
            <div className="dash-icon dash-icon-success" style={{ margin: '0 0 var(--space-4) 0' }}><i className="fas fa-paper-plane"></i></div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>立即申请</div>
            <div style={{ fontSize: 14, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>5步极速申请，在线预约专属金融服务顾问，快速启动融资流程</div>
          </a>
        </div>
      </div>
    </section>
  )
}
