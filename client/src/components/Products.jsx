import { useState, useEffect } from 'react'
import { contentApi } from '../services/api'

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    contentApi.getProducts()
      .then(data => setProducts(data.products))
      .catch(() => {
        setProducts([
          { code:'token', name:'Token贷', subtitle:'按Token消耗额度核定授信', badge:'核心产品', header_class:'token', features:['基于Kai TPM期货交易数据核定授信','按TPM·h（每分钟令牌负载×小时）计量消耗','参考广州模式，聚焦北京词元经济生态','适用对象：AI算力企业、大模型公司','担保方式：Kai平台Token消耗数据增信'] },
          { code:'compute', name:'算力贷', subtitle:'按算力租赁费用30%最高2000万补贴', badge:'补贴支持', header_class:'compute', features:['算力券+数据券各1亿元/年','按算力租赁费用30%给予资金支持','最高2000万元补贴额度','Kai平台提供容量注册与交付确认数据','适用对象：Kai认证容量供应商、智算企业'] },
          { code:'opc', name:'OPC贷', subtitle:'综合Token消耗+征信+知识产权增信', badge:'北京特色', header_class:'opc', features:['专为OPC（一人公司）创业者设计','综合Kai TPM消耗数据+征信+知识产权','赛事获奖记录增信','Kai聚合商支持中小OPC批量采购容量','词元券按消耗50%最高500万支持'] }
        ])
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="section section-alt" id="products">
      <div className="shell-content">
        <div className="section-header fade-up">
          <div className="section-tag"><i className="fas fa-circle"></i> 金融产品</div>
          <h2 className="section-title">三大专属金融产品</h2>
          <p className="section-desc">面向北京AI算力企业、大模型创业公司及OPC创业者，精准解决词元经济融资难题</p>
        </div>

        <div className="products-grid fade-up">
          {products.map(p => (
            <div key={p.code} className="product-card">
              <div className={`product-card-header ${p.header_class}`}>
                <span className="product-badge">{p.badge}</span>
                <div className="product-name">{p.name}</div>
                <div className="product-sub">{p.subtitle}</div>
              </div>
              <div className="product-body">
                <ul className="product-features">
                  {p.features.map((f, i) => <li key={i}><i className="fas fa-check-circle"></i>{f}</li>)}
                </ul>
                <a className="btn btn-outline btn-sm" href="#guide" onClick={e => { e.preventDefault(); document.getElementById('guide')?.scrollIntoView({ behavior: 'smooth' }) }}>
                  了解详情 <i className="fas fa-arrow-right"></i>
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* 贴边表格 - Kai UI: TableContainer noPadding */}
        <div className="fade-up" style={{ marginTop: 'var(--space-12)' }}>
          <div className="section-header" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="section-tag"><i className="fas fa-circle"></i> 产品对比</div>
            <h2 className="section-title">北京Token贷产品对比表</h2>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>对比维度</th>
                  <th>Token贷</th>
                  <th>算力贷</th>
                  <th>OPC贷</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><strong>额度核定</strong></td><td>按Kai TPM期货交易数据核定</td><td>按算力租赁费用30%</td><td style={{ color: 'var(--primary)', fontWeight: 600 }}>综合TPM消耗+征信+知识产权</td></tr>
                <tr><td><strong>最高额度</strong></td><td>按TPM·h消耗量动态核定</td><td style={{ color: 'var(--primary)', fontWeight: 600 }}>2,000万元</td><td>500万元词元券支持</td></tr>
                <tr><td><strong>补贴比例</strong></td><td>按TPM合同/消耗额度</td><td>算力租赁费用30%</td><td style={{ color: 'var(--primary)', fontWeight: 600 }}>词元消耗费用50%</td></tr>
                <tr><td><strong>适用对象</strong></td><td>Kai平台企业采购方</td><td>Kai认证容量供应商</td><td style={{ color: 'var(--primary)', fontWeight: 600 }}>OPC（一人公司）创业者</td></tr>
                <tr><td><strong>增信方式</strong></td><td>Kai TPM结算数据</td><td>算力租赁合同+容量注册</td><td style={{ color: 'var(--primary)', fontWeight: 600 }}>TPM消耗+征信+知识产权+赛事获奖</td></tr>
                <tr><td><strong>数据来源</strong></td><td style={{ color: 'var(--primary)', fontWeight: 600 }}>Kai期货交易与结算记录</td><td>Kai容量注册与交付确认</td><td>Kai聚合商子账户分配数据</td></tr>
                <tr><td><strong>参考模式</strong></td><td>广州Token贷模式（北京版）</td><td>亦庄"词元十条"</td><td style={{ color: 'var(--primary)', fontWeight: 600 }}>北京OPC创新发展行动方案</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
