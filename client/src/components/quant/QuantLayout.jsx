import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function QuantLayout({ children, theme, onToggleTheme }) {
  const { user, logout } = useAuth()
  const location = useLocation()

  const navItems = [
    { path: '/quant', label: '仪表盘', icon: '🏠' },
    { path: '/quant/market', label: '行情', icon: '📊' },
    { path: '/quant/trading', label: '交易', icon: '💹' },
    { path: '/quant/strategy', label: '策略', icon: '🎯' },
    { path: '/quant/risk', label: '风控', icon: '🛡️' },
    { path: '/quant/settings', label: '设置', icon: '⚙️' }
  ]

  return (
    <div className="quant-layout">
      <header className="quant-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/quant" style={{ textDecoration: 'none' }}>
            <h1>
              <span className="quant-badge">QUANT</span>
              KAI 算力期货量化交易系统
            </h1>
          </Link>
        </div>

        <nav className="quant-nav">
          {navItems.map(item => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/quant' && location.pathname.startsWith(item.path))
            return (
              <Link
                key={item.path}
                to={item.path}
                className={isActive ? 'active' : ''}
              >
                {item.icon} {item.label}
              </Link>
            )
          })}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onToggleTheme}
            className="quant-btn quant-btn-secondary"
            style={{ fontSize: 12, padding: '6px 12px' }}
            title="切换主题"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {user ? (
            <>
              <span style={{ fontSize: 13, color: 'var(--gray-600)' }}>
                {user.company_name || user.contact_name || '用户'}
              </span>
              <button onClick={logout} className="quant-btn quant-btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}>
                退出
              </button>
            </>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>未登录</span>
          )}
        </div>
      </header>

      <main style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
