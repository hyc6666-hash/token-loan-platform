import { useState, useEffect, createContext, useContext } from 'react'
import { authApi } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(false)

  // 初始化：异步检查token，不阻塞UI渲染
  useEffect(() => {
    if (!token) return

    const controller = new AbortController()
    const timeout = setTimeout(() => {
      controller.abort()
      localStorage.removeItem('token')
      setToken(null)
    }, 5000)

    // 直接使用 fetch 并传入 signal，确保超时能真正中断请求
    fetch(`${import.meta.env.VITE_API_URL || '/api'}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal
    })
      .then(res => {
        if (!res.ok) throw new Error('auth failed')
        return res.json()
      })
      .then(data => {
        clearTimeout(timeout)
        setUser(data.user)
      })
      .catch(() => {
        clearTimeout(timeout)
        localStorage.removeItem('token')
        setToken(null)
      })

    return () => {
      clearTimeout(timeout)
      controller.abort()
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
