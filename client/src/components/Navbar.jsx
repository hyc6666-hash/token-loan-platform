import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
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
    <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-inner">
        <Link to="/" className="nav-logo">
          <div className="nav-logo-icon">K</div>
          <div className="nav-logo-text"><span>Kai</span> · 北京Token贷</div>
        </Link>

        <ul className={`nav-links ${mobileOpen ? '' : ''}`} style={mobileOpen ? { display: 'flex', flexDirection: 'column', position: 'absolute', top: '64px', left: 0, right: 0, background: 'rgba(15,33,64,0.98)', padding: '20px 24px', gap: '16px' } : {}}>
          {navItems.map(item => (
            <li key={item.section}>
              <a href={`#${item.section}`} onClick={(e) => { e.preventDefault(); scrollTo(item.section) }}>
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="nav-user">
          {user ? (
            <>
              <Link to="/dashboard" className="nav-cta" style={{ fontSize: '13px', padding: '6px 16px' }}>
                <i className="fas fa-user" /> {user.contact_name}
              </Link>
              {isAdmin && (
                <Link to="/admin" className="nav-cta" style={{ fontSize: '13px', padding: '6px 16px', background: 'rgba(124,58,237,0.8)' }}>
                  <i className="fas fa-cog" /> 管理
                </Link>
              )}
              <button className="nav-user-btn" onClick={() => { logout(); navigate('/') }}>退出</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-cta" style={{ fontSize: '13px', padding: '6px 16px' }}>登录</Link>
              <Link to="/register" className="nav-cta" style={{ fontSize: '13px', padding: '6px 16px', background: 'rgba(124,58,237,0.8)' }}>注册</Link>
            </>
          )}
        </div>

        <button className="nav-mobile" onClick={() => setMobileOpen(!mobileOpen)}>
          <i className={`fas fa-${mobileOpen ? 'times' : 'bars'}`}></i>
        </button>
      </div>
    </nav>
  )
}
