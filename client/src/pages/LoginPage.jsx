import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(phone, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>企业登录</h2>
        <p className="auth-sub">登录后可提交申请、查看审批进度</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>手机号</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="请输入注册手机号" required />
          </div>
          <div className="form-group">
            <label>密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="请输入密码" required />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="form-submit" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
        <div className="auth-link">
          还没有账号？<Link to="/register">立即注册</Link>
        </div>
        <div style={{marginTop:16, padding:12, background:'var(--bg-surface)', borderRadius:8, fontSize:13, color:'var(--text-muted)'}}>
          <strong>管理员账号：</strong>13800000000 / admin123
        </div>
      </div>
    </div>
  )
}
