import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { adminApi } from '../services/api'

/**
 * 管理后台 (Kai UI 规范)
 * 
 * 规范要点：
 * 1. tabs (line 变体) + tab.active 2px 品牌色下划线
 * 2. stat-card 数据卡片
 * 3. table 贴边表格 + col-num 数字右对齐
 * 4. badge 状态标签（图标+文字+颜色三重传达）
 * 5. btn-sm 操作按钮
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

const productMap = { token: 'Token贷', compute: '算力贷', opc: 'OPC贷', consult: '咨询' }

export default function AdminPage() {
  const { user, isAdmin } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('stats')
  const [stats, setStats] = useState(null)
  const [applications, setApplications] = useState([])
  const [users, setUsers] = useState([])

  useEffect(() => {
    if (isAdmin) {
      adminApi.getStats().then(setStats).catch(() => {})
      adminApi.getApplications().then(data => setApplications(data.applications || [])).catch(() => {})
      adminApi.getUsers().then(data => setUsers(data.users || [])).catch(() => {})
    }
  }, [isAdmin])

  if (!user || !isAdmin) return <Navigate to="/login" />

  const handleReview = async (id, status) => {
    const note = prompt('审核备注（可选）：')
    try {
      await adminApi.reviewApplication(id, status, note)
      setApplications(applications.map(a => a.id === id ? { ...a, status, review_note: note } : a))
      toast.show(`已${status === 'approved' ? '通过' : status === 'rejected' ? '驳回' : '开始审核'}该申请`, 'success')
    } catch (err) {
      toast.show(err.message, 'error')
    }
  }

  const handleToggleUser = async (u) => {
    const newStatus = u.status === 'active' ? 'disabled' : 'active'
    try {
      await adminApi.toggleUserStatus(u.id, newStatus)
      setUsers(users.map(usr => usr.id === u.id ? { ...usr, status: newStatus } : usr))
      toast.show(`用户已${newStatus === 'active' ? '启用' : '禁用'}`, 'info')
    } catch (err) {
      toast.show(err.message, 'error')
    }
  }

  return (
    <div className="dashboard-page">
      <div className="shell-content">
        <div className="dashboard-header">
          <h2>管理后台</h2>
          <p>审核申请 · 管理用户 · 查看统计</p>
        </div>

        <div className="tabs">
          {['stats', 'applications', 'users'].map(t => (
            <button
              key={t}
              className={`tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'stats' ? '数据统计' : t === 'applications' ? '申请管理' : '用户管理'}
            </button>
          ))}
        </div>

        {tab === 'stats' && stats && (
          <div className="stat-cards">
            <div className="stat-card">
              <div className="stat-card-icon dash-icon dash-icon-primary"><i className="fas fa-users"></i></div>
              <div className="stat-card-value">{stats.totalUsers}</div>
              <div className="stat-card-label">注册企业</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon dash-icon dash-icon-warning"><i className="fas fa-file-alt"></i></div>
              <div className="stat-card-value">{stats.totalApplications}</div>
              <div className="stat-card-label">总申请</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon dash-icon dash-icon-info"><i className="fas fa-clock"></i></div>
              <div className="stat-card-value">{stats.pendingApplications}</div>
              <div className="stat-card-label">待审核</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon dash-icon dash-icon-success"><i className="fas fa-coins"></i></div>
              <div className="stat-card-value">{formatMoney(stats.totalEstimatedAmount)}</div>
              <div className="stat-card-label">已批总额</div>
            </div>
          </div>
        )}

        {tab === 'applications' && (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>企业</th>
                  <th>产品</th>
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
                      <td>{app.company_name}</td>
                      <td>{productMap[app.product_type]}</td>
                      <td className="col-num">{app.estimated_amount > 0 ? formatMoney(app.estimated_amount) + '元' : '—'}</td>
                      <td>
                        <span className={`badge ${sc.badge}`}>
                          <i className={`fas ${sc.icon}`}></i>
                          {sc.label}
                        </span>
                      </td>
                      <td>
                        {app.status === 'pending' && (
                          <>
                            <button className="btn btn-sm btn-secondary" onClick={() => handleReview(app.id, 'reviewing')} style={{ marginRight: 4 }}>开始审核</button>
                            <button className="btn btn-sm btn-primary" onClick={() => handleReview(app.id, 'approved')} style={{ marginRight: 4 }}>通过</button>
                            <button className="btn btn-sm btn-destructive" onClick={() => handleReview(app.id, 'rejected')}>驳回</button>
                          </>
                        )}
                        {app.status === 'reviewing' && (
                          <>
                            <button className="btn btn-sm btn-primary" onClick={() => handleReview(app.id, 'approved')} style={{ marginRight: 4 }}>通过</button>
                            <button className="btn btn-sm btn-destructive" onClick={() => handleReview(app.id, 'rejected')}>驳回</button>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'users' && (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>注册时间</th>
                  <th>企业名称</th>
                  <th>联系人</th>
                  <th>手机号</th>
                  <th>类型</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.created_at?.substring(0, 10)}</td>
                    <td>{u.company_name}</td>
                    <td>{u.contact_name}</td>
                    <td>{u.phone}</td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-primary' : 'badge-neutral'}`}>
                        {u.role === 'admin' ? '管理员' : '企业用户'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                        <i className={`fas ${u.status === 'active' ? 'fa-check-circle' : 'fa-ban'}`}></i>
                        {u.status === 'active' ? '正常' : '禁用'}
                      </span>
                    </td>
                    <td>
                      {u.role !== 'admin' && (
                        <button
                          className={`btn btn-sm ${u.status === 'active' ? 'btn-destructive' : 'btn-primary'}`}
                          onClick={() => handleToggleUser(u)}
                        >
                          {u.status === 'active' ? '禁用' : '启用'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
