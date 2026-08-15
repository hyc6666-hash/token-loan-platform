import { useState, useEffect } from 'react'
import { contentApi } from '../services/api'

export default function Policy() {
  const [policies, setPolicies] = useState([])

  useEffect(() => {
    contentApi.getPolicies()
      .then(data => setPolicies(data.policies))
      .catch(() => {
        setPolicies([
          { title:'《北京市关于加快智能体引领发展的若干措施》', date:'2026年7月', description:'北京市四部门联合印发，明确鼓励发展Token经济，支持银行、保险等金融机构开发支持智能体落地的金融产品。鼓励词元应用商业模式创新。', source_url:'https://www.beijing.gov.cn/zhengce/zhengcefagui/202607/t20260723_4781085.html', highlights:['鼓励发展Token经济','支持金融机构开发金融产品','鼓励词元应用商业模式创新','支持智能体落地应用'], icon_type:'purple', is_latest:1 },
          { title:'亦庄"词元十条" —— 全市首个词元经济专项政策', date:'2026年8月7日', description:'北京经济技术开发区发布，每年发放算力券、数据券各1亿元，按算力租赁费用30%给予最高2000万元资金支持；每年发放1亿元模型券或词元券，按词元消耗费用50%给予最高500万元支持。', source_url:'https://www.ncsti.gov.cn/kjdt/scyq/bjjjjskfq/jkdt/202608/t20260807_252627.html', highlights:['算力券+数据券各1亿元/年','算力租赁30%补贴，最高2000万','词元券1亿元/年，50%支持最高500万','OPC社区专项扶持'], icon_type:'blue', is_latest:1 },
          { title:'OPC创新发展行动方案', date:'2026年', description:'"词元十条"专门针对OPC（一人公司）创业者，OPC社区超4万平米服务超500家主体，提供"即用即补"模型券兑现平台。', source_url:'https://www.beijing.gov.cn/zhengce/zhengcefagui/202606/t20260622_4710194.html', highlights:['OPC社区超4万平米','服务超500家OPC主体','"即用即补"模型券兑现平台','OPC贷专属信贷产品'], icon_type:'cyan', is_latest:0 }
        ])
      })
  }, [])

  const iconClass = (t) => t === 'blue' ? 'primary' : t === 'purple' ? 'info' : 'success'
  const iconName = (t) => t === 'blue' ? 'file-alt' : t === 'purple' ? 'robot' : 'user-tie'

  return (
    <section className="section" id="policy">
      <div className="shell-content">
        <div className="section-header fade-up">
          <div className="section-tag"><i className="fas fa-circle"></i> 政策解读</div>
          <h2 className="section-title">北京词元经济政策全景</h2>
          <p className="section-desc">国家数据局鼓励词元应用商业模式创新，北京率先出台专项支持政策</p>
        </div>

        {/* Timeline */}
        <div className="timeline fade-up">
          {policies.map((p, i) => (
            <div key={i} className="timeline-item">
              <div className={`timeline-dot ${p.is_latest ? 'active' : ''}`}></div>
              <div className="timeline-card">
                <div className="timeline-date">
                  {p.date}
                  {p.is_latest && <span className="badge badge-danger"><i className="fas fa-bolt"></i> 最新</span>}
                </div>
                <div className="timeline-title">{p.title}</div>
                <div className="timeline-desc">{p.description}</div>
                {p.source_url && (
                  <a href={p.source_url} target="_blank" rel="noopener" className="timeline-link">
                    查看原文 <i className="fas fa-external-link-alt"></i>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Policy Cards */}
        <div className="policy-cards fade-up">
          {policies.map((p, i) => (
            <div key={i} className="policy-card">
              <div className={`policy-card-icon ${iconClass(p.icon_type)}`}>
                <i className={`fas fa-${iconName(p.icon_type)}`}></i>
              </div>
              <div className="policy-card-title">{p.title}</div>
              <div className="policy-card-desc">{p.description.substring(0, 40)}...</div>
              <ul className="policy-highlights">
                {p.highlights.map((h, j) => <li key={j}><i className="fas fa-chevron-right"></i>{h}</li>)}
              </ul>
              {p.source_url && (
                <a href={p.source_url} target="_blank" rel="noopener" className="timeline-link">
                  查看原文 <i className="fas fa-external-link-alt"></i>
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
