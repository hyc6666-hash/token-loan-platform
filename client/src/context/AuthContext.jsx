import { useState, useEffect, createContext, useContext } from 'react'
import { authApi } from '../services/api'

/**
 * 认证上下文（AuthContext）
 * 
 * 教学说明：
 * React Context 是React提供的"全局状态"机制。
 * 类似于全局变量，但更安全——只有订阅了Context的组件才能读取。
 * 
 * 工作原理：
 * 1. AuthProvider 包裹整个应用，管理登录状态
 * 2. 任何子组件通过 useAuth() 获取当前用户信息和登录方法
 * 3. 登录后token存入localStorage，刷新页面后自动恢复登录状态
 */
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  // 初始化：检查token是否有效
  useEffect(() => {
    if (token) {
      authApi.getMe()
        .then(data => {
          setUser(data.user)
        })
        .catch(() => {
          // token无效，清除
          localStorage.removeItem('token')
          setToken(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (phone, password) => {
    const data = await authApi.login(phone, password)
    localStorage.setItem('token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data
  }

  const register = async (formData) => {
    const data = await authApi.register(formData)
    localStorage.setItem('token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
