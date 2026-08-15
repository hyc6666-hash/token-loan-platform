import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="shell-content">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="shell-header-brand" style={{ marginBottom: 0 }}>
              <div className="shell-header-brand-icon">K</div>
              <div className="shell-header-brand-text"><span>Kai</span> · 北京Token贷</div>
            </Link>
            <p>北京Token贷 · 词元金融服务平台，服务北京AI算力企业，助力词元经济高质量发展。依托北京市"词元十条"等专项政策，提供Token贷、算力贷、OPC贷一站式金融服务。</p>
          </div>
          <div className="footer-col">
            <h4>金融产品</h4>
            <a href="#products">Token贷</a>
            <a href="#products">算力贷</a>
            <a href="#products">OPC贷</a>
            <a href="#products">产品对比</a>
          </div>
          <div className="footer-col">
            <h4>政策资讯</h4>
            <a href="#policy">词元十条</a>
            <a href="#policy">智能体发展措施</a>
            <a href="#policy">OPC行动方案</a>
            <a href="#policy">政策时间线</a>
          </div>
          <div className="footer-col">
            <h4>服务支持</h4>
            <a href="#guide">申请指南</a>
            <a href="#guide">材料清单</a>
            <a href="#guide">常见问题</a>
            <Link to="/dashboard">我的申请</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>2026 Kai · 北京Token贷 · 词元金融服务平台 ｜ 政策依据：《北京市关于加快智能体引领发展的若干措施》"词元十条"</p>
          <p>全栈动态版 v4.0 · Kai UI Registry</p>
        </div>
      </div>
    </footer>
  )
}
