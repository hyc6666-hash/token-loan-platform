import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { applicationApi } from '../services/api'

export default function FloatApply() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    product_type: 'token',
    company_name: user?.company_name || '',
    contact_name: user?.contact_name || '',
    phone: user?.phone || '',
    notes: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) {
      navigate('/login')
      setOpen(false)
      return
    }
    setSubmitting(true)
    try {
      await applicationApi.submit(form)
      alert('申请提交成功！可在"我的申请"中查看进度')
      setOpen(false)
    } catch (err) {
      alert(err.message)
    }
    setSubmitting(false)
  }

  return (
    <>
      <button className="float-apply" onClick={() => setOpen(true)}>
        <i className="fas fa-paper-plane"></i> 立即申请
      </button>

      {open && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal">
            <button className="modal-close" onClick={() => setOpen(false)}><i className="fas fa-times"></i></button>
            <h3>在线申请预约</h3>
            <p className="modal-sub">{user ? '填写以下信息，专属金融服务顾问将在1个工作日内联系您' : '请先登录后提交申请'}</p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>企业名称</label>
                <input required value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} placeholder="请输入企业全称" />
              </div>
              <div className="form-group">
                <label>申请产品</label>
                <select required value={form.product_type} onChange={e => setForm({...form, product_type: e.target.value})}>
                  <option value="token">Token贷</option>
                  <option value="compute">算力贷</option>
                  <option value="opc">OPC贷</option>
                  <option value="consult">暂不确定，需要咨询</option>
                </select>
              </div>
              <div className="form-group">
                <label>联系人</label>
                <input required value={form.contact_name} onChange={e => setForm({...form, contact_name: e.target.value})} placeholder="请输入联系人姓名" />
              </div>
              <div className="form-group">
                <label>联系电话</label>
                <input required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="请输入手机号码" />
              </div>
              <div className="form-group">
                <label>补充说明</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="可填写企业情况、融资需求等" />
              </div>
              <button type="submit" className="form-submit" disabled={submitting}>
                {submitting ? '提交中...' : '提交预约申请'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
