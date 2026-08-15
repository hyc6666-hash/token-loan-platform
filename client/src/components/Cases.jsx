import { useState, useEffect } from 'react'
import { contentApi } from '../services/api'

export default function Cases() {
  const [cases, setCases] = useState([])

  useEffect(() => {
    contentApi.getCases()
      .then(data => setCases(data.cases))
      .catch(() => {
        setCases([
          { title:'行云科技 · 超百亿授信', tag:'算力贷 + Kai容量注册', description:'2026年8月，行云科技作为Kai认证容量供应商，通过容量注册提前锁定未来收入，同时获得算力贷超百亿授信专项用于北京智算集群建设，按算力租赁费用30%获得资金补贴。', stat_text:'授信规模：120亿元 ｜ 获批时间：2026年8月', stat_icon:'fa-chart-line', bg_class:'bg1', icon_class:'fa-server' },
          { title:'模数OPC社区 · 词元券赋能', tag:'OPC贷 + Kai聚合商', description:'2026年7月入驻OPC社区，创业者通过Kai聚合商批量采购TPM容量，使用词元券按消耗50%获得补贴，首月即节省47万元AI推理调用成本，预计全年节省超180万元。', stat_text:'首月省47万 ｜ 年化预计180万+ ｜ 入驻：2026年7月', stat_icon:'fa-piggy-bank', bg_class:'bg2', icon_class:'fa-user-astronaut' },
          { title:'招商银行 · "招金贷"服务', tag:'银行合作 + Kai结算', description:'2026年6月上线，招商银行北京分行推出"招金贷"，依托Kai平台TPM结算数据评估企业模型服务采购量，首批发放信用额度超8亿元，附带Token权益工程师信用卡，已服务超230家科技企业。', stat_text:'首批授信8亿+ ｜ 服务企业230+ ｜ 上线：2026年6月', stat_icon:'fa-credit-card', bg_class:'bg3', icon_class:'fa-university' }
        ])
      })
  }, [])

  return (
    <section className="section section-alt" id="cases">
      <div className="container">
        <div className="section-header fade-up">
          <div className="section-tag"><i className="fas fa-circle"></i> 成功案例</div>
          <h2 className="section-title dark">北京词元经济实践典范</h2>
          <p className="section-desc">已有企业通过Token贷与词元经济政策获得实质支持</p>
        </div>
        <div className="cases-grid fade-up">
          {cases.map((c, i) => (
            <div key={i} className="case-card">
              <div className={`case-img ${c.bg_class}`}>
                <i className={`fas ${c.icon_class} case-img-icon`}></i>
                <div className="case-img-overlay"><span className="case-tag">{c.tag}</span></div>
              </div>
              <div className="case-body">
                <div className="case-title">{c.title}</div>
                <div className="case-text">{c.description}</div>
                <div className="case-stat"><i className={`fas ${c.stat_icon}`}></i> {c.stat_text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
