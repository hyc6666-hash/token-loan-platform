import { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { applicationApi } from '../services/api'

function formatMoney(num) {
  if (num >= 100000000) return (num / 100000000).toFixed(2) + '亿'
  if (num >= 10000) return (num / 10000).toFixed(1) + '万'
  return num?.toString() || '0'
}

const statusMap = {
  pending: '待审核',
  reviewing: '审核中',
  approved: '已通过',
  rejected: '已驳回',
  withdrawn: '已撤回'
}

const productMap = {
  token: 'Token贷',
  compute: '算力贷',
  opc: 'OPC贷',
  consult: '咨询'
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      applicationApi.getMy()
        .then(data => setApplications(data.applications))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [user])

  if (!user) return <Navigate to="/login" />

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header">
          <h2>我的申请</h2>
          <p>{user.company_name} · {user.contact_name}</p>
        </div>

        <div className="stat-cards">
          <div className="stat-card">
            <div className="stat-card-icon" style={{background:'rgba(37,99,235,0.1)', color:'var(--blue-bright)'}}><i className="fas fa-file-alt"></i></div>
            <div className="stat-card-value">{applications.length}</div>
            <div className="stat-card-label">总申请数</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{background:'rgba(251,191,36,0.1)', color:'#fbbf24'}}><i className="fas fa-clock"></i></div>
            <div className="stat-card-value">{applications.filter(a => a.status === 'pending').length}</div>
            <div className="stat-card-label">待审核</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{background:'rgba(34,197,94,0.1)', color:'#22c55e'}}><i className="fas fa-check-circle"></i></div>
            <div className="stat-card-value">{applications.filter(a => a.status === 'approved').length}</div>
            <div className="stat-card-label">已通过</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{background:'rgba(124,58,237,0.1)', color:'var(--purple-mid)'}}><i className="fas fa-coins"></i></div>
            <div className="stat-card-value">{formatMoney(applications.filter(a => a.status === 'approved').reduce((s, a) => s + (a.estimated_amount || 0), 0))}</div>
            <div className="stat-card-label">已获批总额</div>
          </div>
        </div>

        {loading ? (
          <p style={{textAlign:'center', color:'var(--text-muted)', padding:40}}>加载中...</p>
        ) : applications.length === 0 ? (
          <div style={{textAlign:'center', padding:60, background:'var(--bg-white)', borderRadius:16, border:'1px solid var(--border-light)'}}>
            <i className="fas fa-inbox" style={{fontSize:48, color:'var(--text-muted)', marginBottom:16, display:'block'}}></i>
            <p style={{color:'var(--text-muted)', marginBottom:20}}>暂无申请记录</p>
            <Link to="/" className="nav-cta">返回首页申请</Link>
          </div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table className="app-table">
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
                {applications.map(app => (
                  <tr key={app.id}>
                    <td>{app.created_at?.substring(0, 10)}</td>
                    <td>{productMap[app.product_type] || app.product_type}</td>
                    <td>{app.company_name}</td>
                    <td>{app.estimated_amount > 0 ? formatMoney(app.estimated_amount) + '元' : '—'}</td>
                    <td><span className={`status-badge ${app.status}`}>{statusMap[app.status]}</span></td>
                    <td>
                      {app.status === 'pending' && (
                        <button
                          style={{background:'none', border:'1px solid #ef4444', color:'#ef4444', padding:'4px 12px', borderRadius:6, fontSize:13, cursor:'pointer'}}
                          onClick={async () => {
                            if (confirm('确定撤回此申请？')) {
                              try {
                                await applicationApi.withdraw(app.id)
                                setApplications(applications.map(a => a.id === app.id ? {...a, status:'withdrawn'} : a))
                              } catch (err) { alert(err.message) }
                            }
                          }}
                        >撤回</button>
                      )}
                      {app.review_note && <span style={{fontSize:12, color:'var(--text-muted)', marginLeft:8}}>{app.review_note}</span>}
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
