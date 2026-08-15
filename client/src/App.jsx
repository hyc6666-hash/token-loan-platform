import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import FloatApply from './components/FloatApply'
import ToastProvider from './components/Toast'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import AdminPage from './pages/AdminPage'

/**
 * App 根组件
 * 
 * Kai UI 规范要点：
 * 1. AppShell 布局：固定头部 + 内容区
 * 2. light/dark 双主题：通过 html.dark 类名控制
 * 3. 主题偏好存储在 localStorage（版本化键）
 */
export default function App() {
  const { loading } = useAuth()

  // 主题模式：system / light / dark
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('kai-color-mode') || 'system'
  })

  // 应用主题
  useEffect(() => {
    const applyTheme = (mode) => {
      const isDark = mode === 'dark' || 
        (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.classList.toggle('dark', isDark)
      document.documentElement.setAttribute('data-color-mode', isDark ? 'dark' : 'light')
    }
    applyTheme(theme)
    localStorage.setItem('kai-color-mode', theme)

    // 监听系统主题变化
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => applyTheme('system')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => {
      const current = prev === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : prev
      return current === 'dark' ? 'light' : 'dark'
    })
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div style={{ color: 'var(--text-tertiary)', fontSize: 16 }}>加载中...</div>
      </div>
    )
  }

  return (
    <ToastProvider>
      <div className="app-shell">
        <Navbar theme={theme} onToggleTheme={toggleTheme} />
        <main className="shell-content" style={{ padding: 0, maxWidth: '100%' }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
        <Footer />
        <FloatApply />
      </div>
    </ToastProvider>
  )
}
