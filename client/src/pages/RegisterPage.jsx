import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const [form, setForm] = useState({
    company_name: '', contact_name: '', phone: '', email: '', password: '',
    company_type: 'ai', region_beijing: true
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) {
      setError('密码至少6位')
      return
    }
    setLoading(true)
    try {
      await register(form)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>企业注册</h2>
        <p className="auth-sub">注册后即可在线申请Token贷等金融产品</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>企业名称</label>
            <input required value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} placeholder="请输入企业全称" />
          </div>
          <div className="form-group">
            <label>联系人</label>
            <input required value={form.contact_name} onChange={e => setForm({...form, contact_name: e.target.value})} placeholder="请输入联系人姓名" />
          </div>
          <div className="form-group">
            <label>手机号</label>
            <input type="tel" required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="请输入手机号（将作为登录账号）" />
          </div>
          <div className="form-group">
            <label>邮箱（选填）</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="请输入邮箱" />
          </div>
          <div className="form-group">
            <label>企业类型</label>
            <select value={form.company_type} onChange={e => setForm({...form, company_type: e.target.value})}>
              <option value="ai">AI算力企业 / 大模型公司</option>
              <option value="compute">智算集群建设企业</option>
              <option value="opc">OPC（一人公司）创业者</option>
              <option value="startup">大模型创业公司</option>
            </select>
          </div>
          <div className="form-group">
            <label>密码</label>
            <input type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="至少6位" />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="form-submit" disabled={loading}>
            {loading ? '注册中...' : '注册'}
          </button>
        </form>
        <div className="auth-link">
          已有账号？<Link to="/login">立即登录</Link>
        </div>
      </div>
    </div>
  )
}
