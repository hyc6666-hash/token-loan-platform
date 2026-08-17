import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ToastProvider from './components/Toast'
import QuantLayout from './components/quant/QuantLayout'
import QuantDashboard from './pages/quant/QuantDashboard'
import MarketPage from './pages/quant/MarketPage'
import TradingPage from './pages/quant/TradingPage'
import StrategyPage from './pages/quant/StrategyPage'
import RiskPage from './pages/quant/RiskPage'
import SettingsPage from './pages/quant/SettingsPage'
import PipelinePage from './pages/quant/PipelinePage'

/**
 * App 根组件 — KAI 算力期货量化交易系统
 * 默认暗色模式（高科技风格）
 */
export default function App() {
  // 主题模式：默认 dark
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('kai-color-mode') || 'dark'
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

  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/quant" replace />} />
        <Route path="/quant" element={<QuantLayout theme={theme} onToggleTheme={toggleTheme}><QuantDashboard /></QuantLayout>} />
        <Route path="/quant/pipeline" element={<QuantLayout theme={theme} onToggleTheme={toggleTheme}><PipelinePage /></QuantLayout>} />
        <Route path="/quant/market" element={<QuantLayout theme={theme} onToggleTheme={toggleTheme}><MarketPage /></QuantLayout>} />
        <Route path="/quant/trading" element={<QuantLayout theme={theme} onToggleTheme={toggleTheme}><TradingPage /></QuantLayout>} />
        <Route path="/quant/strategy" element={<QuantLayout theme={theme} onToggleTheme={toggleTheme}><StrategyPage /></QuantLayout>} />
        <Route path="/quant/risk" element={<QuantLayout theme={theme} onToggleTheme={toggleTheme}><RiskPage /></QuantLayout>} />
        <Route path="/quant/settings" element={<QuantLayout theme={theme} onToggleTheme={toggleTheme}><SettingsPage /></QuantLayout>} />
        <Route path="*" element={<Navigate to="/quant" replace />} />
      </Routes>
    </ToastProvider>
  )
}
