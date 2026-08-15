import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { adminApi } from '../services/api'

function formatMoney(num) {
  if (num >= 100000000) return (num / 100000000).toFixed(2) + '亿'
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  return num?.toString() || '0'
}

const statusMap = { pending:'待审核', reviewing:'审核中', approved:'已通过', rejected:'已驳回', withdrawn:'已撤回' }
const productMap = { token:'Token贷', compute:'算力贷', opc:'OPC贷', consult:'咨询' }

export default function AdminPage() {
  const { user, isAdmin } = useAuth()
  const [tab, setTab] = useState('stats')
  const [stats, setStats] = useState(null)
  const [applications, setApplications] = useState([])
  const [users, setUsers] = useState([])

  useEffect(() => {
    if (isAdmin) {
      adminApi.getStats().then(setStats).catch(() => {})
      adminApi.getApplications().then(data => setApplications(data.applications)).catch(() => {})
      adminApi.getUsers().then(data => setUsers(data.users)).catch(() => {})
    }
  }, [isAdmin])

  if (!user || !isAdmin) return <Navigate to="/login" />

  const handleReview = async (id, status) => {
    const note = prompt('审核备注（可选）：')
    try {
      await adminApi.reviewApplication(id, status, note)
      setApplications(applications.map(a => a.id === id ? {...a, status, review_note: note} : a))
    } catch (err) { alert(err.message) }
  }

  return (
    <div className="admin-page">
      <div className="container">
        <div className="dashboard-header">
          <h2>管理后台</h2>
          <p>审核申请 · 管理用户 · 查看统计</p>
        </div>

        <div className="admin-tabs">
          {['stats','applications','users'].map(t => (
            <button key={t} className={`admin-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'stats' ? '数据统计' : t === 'applications' ? '申请管理' : '用户管理'}
            </button>
          ))}
        </div>

        {tab === 'stats' && stats && (
          <div className="stat-cards">
            <div className="stat-card">
              <div className="stat-card-icon" style={{background:'rgba(37,99,235,0.1)', color:'var(--blue-bright)'}}><i className="fas fa-users"></i></div>
              <div className="stat-card-value">{stats.totalUsers}</div>
              <div className="stat-card-label">注册企业</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon" style={{background:'rgba(251,191,36,0.1)', color:'#fbbf24'}}><i className="fas fa-file-alt"></i></div>
              <div className="stat-card-value">{stats.totalApplications}</div>
              <div className="stat-card-label">总申请</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon" style={{background:'rgba(239,68,68,0.1)', color:'#ef4444'}}><i className="fas fa-clock"></i></div>
              <div className="stat-card-value">{stats.pendingApplications}</div>
              <div className="stat-card-label">待审核</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon" style={{background:'rgba(34,197,94,0.1)', color:'#22c55e'}}><i className="fas fa-coins"></i></div>
              <div className="stat-card-value">{formatMoney(stats.totalEstimatedAmount)}</div>
              <div className="stat-card-label">已批总额</div>
            </div>
          </div>
        )}

        {tab === 'applications' && (
          <div style={{overflowX:'auto'}}>
            <table className="app-table">
              <thead>
                <tr><th>时间</th><th>企业</th><th>产品</th><th>预估额度</th><th>状态</th><th>操作</th></tr>
              </thead>
              <tbody>
                {applications.map(app => (
                  <tr key={app.id}>
                    <td>{app.created_at?.substring(0,10)}</td>
                    <td>{app.company_name}</td>
                    <td>{productMap[app.product_type]}</td>
                    <td>{app.estimated_amount > 0 ? formatMoney(app.estimated_amount) + '元' : '—'}</td>
                    <td><span className={`status-badge ${app.status}`}>{statusMap[app.status]}</span></td>
                    <td>
                      {app.status === 'pending' && (
                        <>
                          <button onClick={() => handleReview(app.id, 'reviewing')} style={{background:'var(--blue-bright)', color:'#fff', border:'none', padding:'4px 10px', borderRadius:6, fontSize:12, cursor:'pointer', marginRight:4}}>开始审核</button>
                          <button onClick={() => handleReview(app.id, 'approved')} style={{background:'#22c55e', color:'#fff', border:'none', padding:'4px 10px', borderRadius:6, fontSize:12, cursor:'pointer', marginRight:4}}>通过</button>
                          <button onClick={() => handleReview(app.id, 'rejected')} style={{background:'#ef4444', color:'#fff', border:'none', padding:'4px 10px', borderRadius:6, fontSize:12, cursor:'pointer'}}>驳回</button>
                        </>
                      )}
                      {app.status === 'reviewing' && (
                        <>
                          <button onClick={() => handleReview(app.id, 'approved')} style={{background:'#22c55e', color:'#fff', border:'none', padding:'4px 10px', borderRadius:6, fontSize:12, cursor:'pointer', marginRight:4}}>通过</button>
                          <button onClick={() => handleReview(app.id, 'rejected')} style={{background:'#ef4444', color:'#fff', border:'none', padding:'4px 10px', borderRadius:6, fontSize:12, cursor:'pointer'}}>驳回</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'users' && (
          <div style={{overflowX:'auto'}}>
            <table className="app-table">
              <thead>
                <tr><th>注册时间</th><th>企业名称</th><th>联系人</th><th>手机号</th><th>类型</th><th>状态</th><th>操作</th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.created_at?.substring(0,10)}</td>
                    <td>{u.company_name}</td>
                    <td>{u.contact_name}</td>
                    <td>{u.phone}</td>
                    <td>{u.role === 'admin' ? '管理员' : '企业用户'}</td>
                    <td><span className={`status-badge ${u.status === 'active' ? 'approved' : 'rejected'}`}>{u.status === 'active' ? '正常' : '禁用'}</span></td>
                    <td>
                      {u.role !== 'admin' && (
                        <button
                          onClick={async () => {
                            const newStatus = u.status === 'active' ? 'disabled' : 'active'
                            try {
                              await adminApi.toggleUserStatus(u.id, newStatus)
                              setUsers(users.map(usr => usr.id === u.id ? {...usr, status: newStatus} : usr))
                            } catch (err) { alert(err.message) }
                          }}
                          style={{background: u.status === 'active' ? '#ef4444' : '#22c55e', color:'#fff', border:'none', padding:'4px 10px', borderRadius:6, fontSize:12, cursor:'pointer'}}
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
