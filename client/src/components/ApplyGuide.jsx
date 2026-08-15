import { useState } from 'react'

const faqs = [
  { q: 'Kai平台是什么？和Token贷有什么关系？', a: 'Kai是企业级模型服务容量市场平台，通过TPM（每分钟令牌负载）指标将模型服务能力标准化为可交易的"期货"产品。Token贷依托Kai平台的期货交易与结算数据实现精准授信——企业的TPM消耗记录即为信用凭证，无需传统抵押物即可获得融资。' },
  { q: 'Token贷和广州模式有何不同？', a: '北京Token贷在参考广州模式基础上，深度结合Kai TPM期货交易数据和北京词元经济生态，依托亦庄词元工厂的Token消耗数据核定授信，同时叠加"词元十条"补贴政策，企业可享受即用即补的双重优惠。' },
  { q: 'OPC贷对一人公司有什么特殊要求？', a: 'OPC贷是北京特色产品，专为OPC（一人公司）创业者设计。除基础资质外，可综合运用Token消耗数据、赛事获奖记录、创始人征信、自主知识产权等多维度增信，降低单人企业的融资门槛。' },
  { q: '算力券和词元券如何申请兑现？', a: '通过北京亦庄"即用即补"模型券兑现平台在线申请。算力券按租赁费用30%补贴（最高2000万），词元券按消耗费用50%支持（最高500万），实现即用即补、快速兑现。' },
  { q: '申请周期大约多长？', a: '资料齐全情况下，从提交申请到额度核定约5-10个工作日，签约放款约3-5个工作日。平台提供全流程在线追踪，实时查看审批进度。' },
  { q: '外地企业可以申请吗？', a: '目前各项产品主要面向在北京注册或在北京亦庄有实际经营场所的AI企业。外地企业如需申请，建议在北京设立分支机构或入驻OPC社区，即可享受相关政策支持。' }
]

export default function ApplyGuide() {
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <section className="section" id="guide">
      <div className="container">
        <div className="section-header fade-up">
          <div className="section-tag"><i className="fas fa-circle"></i> 申请指南</div>
          <h2 className="section-title dark">5步极速申请</h2>
          <p className="section-desc">从提交申请到放款，全流程透明高效</p>
        </div>

        <div className="steps-flow fade-up">
          {['在线预约|填写基本信息，选择产品类型', '资料提交|上传企业资质与Token消耗数据', '资质审核|银行与平台联合审核企业资质', '额度核定|根据Token/算力数据核定授信', '签约放款|线上签约，快速到账'].map((s, i) => {
            const [title, desc] = s.split('|')
            return (
              <div key={i} className="step-item">
                <div className="step-num">{i + 1}</div>
                {i < 4 && <div className="step-line"></div>}
                <div className="step-title">{title}</div>
                <div className="step-desc">{desc}</div>
              </div>
            )
          })}
        </div>

        <div className="guide-cols fade-up">
          <div className="materials-card">
            <div className="materials-title"><i className="fas fa-folder-open"></i> 申请材料清单</div>
            <ul className="material-list">
              {[
                ['企业营业执照副本', true],
                ['Token消耗数据报告 / 算力租赁合同', true],
                ['法人/创始人身份证明', true],
                ['企业征信报告', true],
                ['自主知识产权证明（OPC贷适用）', false],
                ['赛事获奖证书（OPC贷增信用）', false],
                ['近一年财务报表', false],
                ['智算集群建设方案（算力贷适用）', false],
              ].map(([text, req], i) => (
                <li key={i}>
                  <i className="fas fa-file-alt"></i> {text}
                  {req && <span className="required">必填</span>}
                </li>
              ))}
            </ul>
          </div>
          <div className="faq-card">
            <div className="faq-title"><i className="fas fa-question-circle"></i> 常见问题</div>
            {faqs.map((f, i) => (
              <div key={i} className="faq-item">
                <div className={`faq-q ${openFaq === i ? 'open' : ''}`} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  {f.q} <i className="fas fa-chevron-down"></i>
                </div>
                <div className={`faq-a ${openFaq === i ? 'open' : ''}`}>{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
