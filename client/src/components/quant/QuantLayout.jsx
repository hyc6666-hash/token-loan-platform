import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function QuantLayout({ children, theme, onToggleTheme }) {
  const { user, logout } = useAuth()
  const location = useLocation()

  const navItems = [
    { path: '/quant', label: '仪表盘', icon: 'fa-gauge-high' },
    { path: '/quant/pipeline', label: 'AI Pipeline', icon: 'fa-diagram-project' },
    { path: '/quant/market', label: '行情', icon: 'fa-chart-line' },
    { path: '/quant/trading', label: '交易', icon: 'fa-arrows-rotate' },
    { path: '/quant/strategy', label: '策略', icon: 'fa-bullseye' },
    { path: '/quant/risk', label: '风控', icon: 'fa-shield-halved' },
    { path: '/quant/settings', label: '设置', icon: 'fa-gear' }
  ]

  return (
    <div className="quant-layout">
      {/* HUD 头部 */}
      <header className="quant-header">
        <Link to="/quant" className="quant-logo">
          <span className="quant-logo-mark">K</span>
          <span>KAI<span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>·QUANT</span></span>
        </Link>

        <nav className="quant-nav">
          {navItems.map(item => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/quant' && location.pathname.startsWith(item.path))
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`quant-nav-link ${isActive ? 'active' : ''}`}
              >
                <i className={`fa-solid ${item.icon}`} style={{ fontSize: 12 }} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="quant-header-right">
          {/* 连接状态 */}
          <div className="quant-status">
            <span className="quant-status-dot" />
            <span>LIVE</span>
          </div>

          {/* 主题切换 */}
          <button
            onClick={onToggleTheme}
            className="theme-toggle"
            title="切换主题"
          >
            <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} />
          </button>

          {/* 用户 */}
          {user ? (
            <>
              <span className="text-sm text-tertiary" style={{ fontFamily: 'var(--font-mono)' }}>
                {user.company_name || user.contact_name || 'USER'}
              </span>
              <button onClick={logout} className="btn btn-outline btn-sm">
                <i className="fa-solid fa-right-from-bracket" />
                退出
              </button>
            </>
          ) : (
            <span className="text-sm text-muted" style={{ fontFamily: 'var(--font-mono)' }}>GUEST</span>
          )}
        </div>
      </header>

      {/* 连接横幅 */}
      <div className="quant-banner">
        <span className="quant-status-dot" />
        <span>SYSTEM ONLINE</span>
        <span className="quant-banner-sep" />
        <span>ENGINE v2.0</span>
        <span className="quant-banner-sep" />
        <span>LATENCY &lt;50ms</span>
        <span className="quant-banner-sep" />
        <span>UPTIME 99.9%</span>
      </div>

      {/* 主内容 */}
      <main className="quant-main">
        {children}
      </main>
    </div>
  )
}
