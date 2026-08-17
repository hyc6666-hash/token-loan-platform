/**
 * KAI 市场数据服务
 *
 * 原先使用 Playwright 渲染 hongkong.kai.com SPA 页面提取数据。
 * 现已改为使用纯 JavaScript 确定性模拟引擎（kaiSimulator.js），
 * 从 hongkong.kai.com 的 JS bundle 逆向提取的模拟逻辑，
 * 无需 Playwright/浏览器，可在任何云端环境运行。
 *
 * 保留原导出接口（scrapeKaiMarket, analyzeOrderBookDepth）以兼容现有代码。
 */

import { getKaiMarketData, analyzeOrderBookDepth } from './kaiSimulator.js'

/**
 * 获取 KAI 实时市场数据
 * 兼容原 scrapeKaiMarket 接口
 */
export async function scrapeKaiMarket() {
  return getKaiMarketData()
}

export { analyzeOrderBookDepth }

export default { scrapeKaiMarket, analyzeOrderBookDepth }
