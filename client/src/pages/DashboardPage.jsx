import { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { applicationApi } from '../services/api'

/**
 * 用户仪表盘 (Kai UI 规范)
 * 
 * 规范要点：
 * 1. stat-card 数据卡片 + dash-icon 图标
 * 2. table 贴边表格 + col-num 数字右对齐
 * 3. badge 状态标签（图标+文字+颜色三重传达）
 * 4. empty 空状态
 * 5. btn-sm / btn-outline 操作按钮
 */

function formatMoney(num) {
  if (num >= 100000000) return (num / 100000000).toFixed(2) + '亿'
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  return num?.toString() || '0'
}

const statusConfig = {
  pending:   { label: '待审核', badge: 'badge-warning', icon: 'fa-clock' },
  reviewing: { label: '审核中', badge: 'badge-info',    icon: 'fa-spinner' },
  approved:  { label: '已通过', badge: 'badge-success', icon: 'fa-check-circle' },
  rejected:  { label: '已驳回', badge: 'badge-danger',  icon: 'fa-times-circle' },
  withdrawn: { label: '已撤回', badge: 'badge-neutral', icon: 'fa-undo' }
}

const productMap = {
  token: 'Token贷',
  compute: '算力贷',
  opc: 'OPC贷',
  consult: '咨询'
}

export default function DashboardPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      applicationApi.getMy()
        .then(data => setApplications(data.applications || []))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [user])

  if (!user) return <Navigate to="/login" />

  const handleWithdraw = async (id) => {
    if (!confirm('确定撤回此申请？')) return
    try {
      await applicationApi.withdraw(id)
      setApplications(applications.map(a => a.id === id ? { ...a, status: 'withdrawn' } : a))
      toast.show('申请已撤回', 'info')
    } catch (err) {
      toast.show(err.message, 'error')
    }
  }

  const approvedAmount = applications
    .filter(a => a.status === 'approved')
    .reduce((s, a) => s + (a.estimated_amount || 0), 0)

  return (
    <div className="dashboard-page">
      <div className="shell-content">
        <div className="dashboard-header">
          <h2>我的申请</h2>
          <p>{user.company_name} · {user.contact_name}</p>
        </div>

        <div className="stat-cards">
          <div className="stat-card">
            <div className="stat-card-icon dash-icon dash-icon-primary"><i className="fas fa-file-alt"></i></div>
            <div className="stat-card-value">{applications.length}</div>
            <div className="stat-card-label">总申请数</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon dash-icon dash-icon-warning"><i className="fas fa-clock"></i></div>
            <div className="stat-card-value">{applications.filter(a => a.status === 'pending').length}</div>
            <div className="stat-card-label">待审核</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon dash-icon dash-icon-success"><i className="fas fa-check-circle"></i></div>
            <div className="stat-card-value">{applications.filter(a => a.status === 'approved').length}</div>
            <div className="stat-card-label">已通过</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon dash-icon dash-icon-info"><i className="fas fa-coins"></i></div>
            <div className="stat-card-value">{formatMoney(approvedAmount)}</div>
            <div className="stat-card-label">已获批总额</div>
          </div>
        </div>

        {loading ? (
          <div className="empty">
            <div className="empty-icon"><i className="fas fa-spinner fa-pulse"></i></div>
            <p className="empty-text">加载中...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="card">
            <div className="empty">
              <div className="empty-icon"><i className="fas fa-inbox"></i></div>
              <p className="empty-text">暂无申请记录</p>
              <Link to="/" className="btn btn-primary">返回首页申请</Link>
            </div>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>申请时间</th>
                  <th>产品类型</th>
                  <th>企业名称</th>
                  <th>预估额度</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(app => {
                  const sc = statusConfig[app.status] || statusConfig.pending
                  return (
                    <tr key={app.id}>
                      <td>{app.created_at?.substring(0, 10)}</td>
                      <td>{productMap[app.product_type] || app.product_type}</td>
                      <td>{app.company_name}</td>
                      <td className="col-num">{app.estimated_amount > 0 ? formatMoney(app.estimated_amount) + '元' : '—'}</td>
                      <td>
                        <span className={`badge ${sc.badge}`}>
                          <i className={`fas ${sc.icon}`}></i>
                          {sc.label}
                        </span>
                      </td>
                      <td>
                        {app.status === 'pending' && (
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => handleWithdraw(app.id)}
                          >
                            撤回
                          </button>
                        )}
                        {app.review_note && (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{app.review_note}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
