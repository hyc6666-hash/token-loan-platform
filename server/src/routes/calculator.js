import express from 'express'
import db from '../database/init.js'

const router = express.Router()

/**
 * 额度计算器路由
 * 
 * 教学说明：
 * 计算逻辑放在后端而非前端的原因：
 * 1. 安全性：前端代码可被修改，后端逻辑不可被用户篡改
 * 2. 一致性：确保所有渠道（网页、APP、小程序）计算结果一致
 * 3. 可审计：后端可记录每次计算请求，用于数据分析
 * 4. 可更新：政策变化时只需更新后端，无需重新部署前端
 */

router.post('/estimate', (req, res) => {
  try {
    const { company_type, annual_compute_cost, annual_token_cost, ip_count, region_beijing } = req.body

    const compute = Number(annual_compute_cost) || 0  // 万元
    const token = Number(annual_token_cost) || 0       // 万元
    const ip = Number(ip_count) || 0
    const region = region_beijing !== false

    if (!region) {
      return res.json({
        eligible: false,
        message: '您当前不在北京注册，建议在北京设立分支机构或入驻OPC社区后再申请相关政策支持。',
        matches: []
      })
    }

    const matches = []
    let totalMax = 0

    // 算力贷 — 按算力租赁费用30%补贴，最高2000万
    if (compute > 0 && ['ai', 'compute', 'startup'].includes(company_type)) {
      const subsidy = Math.min(Math.round(compute * 10000 * 0.3), 20000000)
      matches.push({
        name: '算力贷',
        icon: 'fa-server',
        subsidy,
        detail: '算力租赁费用30%补贴',
        max: '2000万元'
      })
      totalMax += subsidy
    }

    // 词元券 — 按词元消耗费用50%支持，最高500万
    if (token > 0) {
      const subsidy = Math.min(Math.round(token * 10000 * 0.5), 5000000)
      matches.push({
        name: '词元券（模型券）',
        icon: 'fa-coins',
        subsidy,
        detail: '词元消耗费用50%支持',
        max: '500万元'
      })
      totalMax += subsidy
    }

    // Token贷 — 按Token消耗额度核定
    if (token > 0 && ['ai', 'startup'].includes(company_type)) {
      const credit = token * 10000 * 3
      matches.push({
        name: 'Token贷',
        icon: 'fa-cube',
        subsidy: credit,
        detail: '按TPM消耗额度核定授信（预估3倍消耗额）',
        max: '动态核定'
      })
      totalMax += credit
    }

    // OPC贷 — 综合增信
    if (company_type === 'opc') {
      let opcCredit = token * 10000 * 2 + ip * 50000
      if (token === 0) opcCredit = ip * 50000 + 100000
      matches.push({
        name: 'OPC贷',
        icon: 'fa-user-tie',
        subsidy: opcCredit,
        detail: `综合TPM消耗+征信+知识产权（${ip}项）`,
        max: '500万元词元券支持'
      })
      totalMax += opcCredit
    }

    // 数据券
    if (compute > 0) {
      matches.push({
        name: '数据券',
        icon: 'fa-database',
        subsidy: 0,
        detail: '可申请数据券补贴（年度总额1亿元）',
        max: '共享池'
      })
    }

    if (matches.length === 0) {
      return res.json({
        eligible: true,
        message: '请输入算力租赁费用或Token消耗费用以便匹配适合的政策',
        matches: []
      })
    }

    res.json({
      eligible: true,
      matches,
      total: totalMax,
      disclaimer: '预估结果基于"词元十条"等政策条款计算，实际额度受企业资质、银行审核等因素影响，仅供参考。'
    })
  } catch (err) {
    console.error('计算器错误:', err)
    res.status(500).json({ error: '计算失败，请稍后重试' })
  }
})

export default router
