import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

/**
 * 注册页 (Kai UI 规范)
 * 
 * 规范要点：
 * 1. field / input / select 组件
 * 2. btn-loading 保持按钮宽度
 * 3. field-error 错误提示
 */
export default function RegisterPage() {
  const [form, setForm] = useState({
    company_name: '', contact_name: '', phone: '', email: '', password: '',
    company_type: 'ai', region_beijing: true
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

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
      toast.show('注册成功，欢迎使用Token贷平台！', 'success')
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <h2>企业注册</h2>
        <p className="auth-sub">注册后即可在线申请Token贷等金融产品</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="field-label">企业名称</label>
            <input className="input" required value={form.company_name} onChange={set('company_name')} placeholder="请输入企业全称" />
          </div>
          <div className="field">
            <label className="field-label">联系人</label>
            <input className="input" required value={form.contact_name} onChange={set('contact_name')} placeholder="请输入联系人姓名" />
          </div>
          <div className="field">
            <label className="field-label">手机号</label>
            <input className="input" type="tel" required value={form.phone} onChange={set('phone')} placeholder="请输入手机号（将作为登录账号）" />
          </div>
          <div className="field">
            <label className="field-label">邮箱 <span className="hint">选填</span></label>
            <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="请输入邮箱" />
          </div>
          <div className="field">
            <label className="field-label">企业类型</label>
            <select className="select" value={form.company_type} onChange={set('company_type')}>
              <option value="ai">AI算力企业 / 大模型公司</option>
              <option value="compute">智算集群建设企业</option>
              <option value="opc">OPC（一人公司）创业者</option>
              <option value="startup">大模型创业公司</option>
            </select>
          </div>
          <div className="field">
            <label className="field-label">密码</label>
            <input className="input" type="password" required value={form.password} onChange={set('password')} placeholder="至少6位" />
          </div>
          {error && <p className="field-error">{error}</p>}
          <button
            type="submit"
            className={`btn btn-primary btn-lg ${loading ? 'btn-loading' : ''}`}
            style={{ width: '100%', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? '注册中' : '注册'}
          </button>
        </form>
        <div className="auth-link">
          已有账号？<Link to="/login">立即登录</Link>
        </div>
      </div>
    </div>
  )
}
