import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar({ theme, onToggleTheme }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, isAdmin, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id) => {
    setMobileOpen(false)
    if (location.pathname !== '/') {
      navigate('/')
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const navItems = [
    { label: '首页', section: 'home' },
    { label: '产品中心', section: 'products' },
    { label: '政策解读', section: 'policy' },
    { label: '成功案例', section: 'cases' },
    { label: '额度测算', section: 'calculator' },
    { label: '申请指南', section: 'guide' },
    { label: '关于我们', section: 'about' },
  ]

  return (
    <header className="shell-header" style={{ boxShadow: scrolled ? 'var(--shadow-sm)' : 'none' }}>
      <Link to="/" className="shell-header-brand">
        <div className="shell-header-brand-icon">K</div>
        <div className="shell-header-brand-text"><span>Kai</span> · 北京Token贷</div>
      </Link>

      <nav className="shell-header-nav" style={mobileOpen ? {
        display: 'flex',
        flexDirection: 'column',
        position: 'absolute',
        top: 'var(--shell-header-height)',
        left: 0, right: 0,
        background: 'var(--background)',
        padding: 'var(--space-4)',
        gap: 'var(--space-1)',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)'
      } : {}}>
        {navItems.map(item => (
          <a key={item.section} href={`#${item.section}`} onClick={(e) => { e.preventDefault(); scrollTo(item.section) }}>
            {item.label}
          </a>
        ))}
      </nav>

      <div className="shell-header-actions">
        {/* 主题切换 - Kai UI: useColorMode */}
        <button className="theme-toggle" onClick={onToggleTheme} aria-label="切换主题">
          <i className={`fas fa-${theme === 'dark' ? 'sun' : 'moon'}`}></i>
        </button>

        {user ? (
          <>
            <Link to="/dashboard" className="btn btn-secondary btn-sm">
              <i className="fas fa-user" /> {user.contact_name}
            </Link>
            {isAdmin && (
              <Link to="/admin" className="btn btn-primary btn-sm">
                <i className="fas fa-cog" /> 管理
              </Link>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => { logout(); navigate('/') }}>
              退出
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-secondary btn-sm">登录</Link>
            <Link to="/register" className="btn btn-primary btn-sm">注册</Link>
          </>
        )}
      </div>

      <button className="shell-header-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
        <i className={`fas fa-${mobileOpen ? 'times' : 'bars'}`}></i>
      </button>
    </header>
  )
}
