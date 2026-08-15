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
 * 教学说明：
 * React Router 实现前端路由（SPA单页应用）：
 * - 用户切换页面时不会刷新整个页面，而是只更新变化的部分
 * - 每个Route对应一个页面组件
 * - 受保护的路由（如Dashboard）需要检查登录状态
 */
export default function App() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gradient-hero)' }}>
        <div style={{ color: '#fff', fontSize: 18 }}>加载中...</div>
      </div>
    )
  }

  return (
    <ToastProvider>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
      <Footer />
      <FloatApply />
    </ToastProvider>
  )
}
