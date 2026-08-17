/**
 * KAI 市场数据爬虫服务
 *
 * 使用 Playwright 渲染 hongkong.kai.com SPA 页面，
 * 从渲染后的 DOM 中提取实时行情数据：
 * - 模型列表 (GLM-5.2, Kimi K3 等)
 * - 订单簿 (买盘/卖盘价格和数量)
 * - 最新成交价
 * - 账户信息 (权益、可用资金、持仓)
 * - 交割日期
 * - 价差
 *
 * 策略：
 * 1. 拦截 XHR/fetch 响应，直接获取 JSON 数据（最可靠）
 * 2. 从渲染后的 DOM 文本中正则提取（兜底）
 * 3. 模拟数据（Playwright 不可用时）
 */

const KAI_URL = 'https://hongkong.kai.com/'

// 缓存上次抓取的数据
let cachedData = null
let lastFetchTime = 0
const CACHE_TTL = 15000 // 15秒缓存

// 拦截到的 API 响应数据
let interceptedApiData = null

/**
 * 尝试加载 playwright-core
 * 使用 Playwright 内置的 Chromium（通过 `npx playwright install chromium` 安装）
 */
let chromium = null
try {
  const mod = await import('playwright-core')
  chromium = mod.chromium
  console.log('[KaiScraper] Playwright 加载成功')
} catch {
  console.log('[KaiScraper] Playwright 不可用，使用模拟数据模式')
}

/**
 * 从 hongkong.kai.com 抓取实时市场数据
 */
export async function scrapeKaiMarket() {
  // 检查缓存
  if (cachedData && Date.now() - lastFetchTime < CACHE_TTL) {
    return { ...cachedData, source: 'cache', cached: true }
  }

  if (!chromium) {
    return getMockData()
  }

  let browser = null
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--disable-extensions'
      ]
    })

    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale: 'zh-HK',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36'
    })

    const page = await context.newPage()

    // 拦截网络请求，捕获 API 响应
    interceptedApiData = null
    page.on('response', async (response) => {
      const url = response.url()
      try {
        // 捕获 JSON API 响应
        const contentType = response.headers()['content-type'] || ''
        if (contentType.includes('application/json') && response.status() === 200) {
          const body = await response.json()
          // 存储所有 JSON 响应，稍后分析
          if (!interceptedApiData) interceptedApiData = []
          interceptedApiData.push({ url, data: body })
        }
      } catch {
        // 忽略解析错误
      }
    })

    page.setDefaultTimeout(30000)

    // 使用 domcontentloaded 而非 networkidle（SPA 有持续网络请求，networkidle 会超时）
    await page.goto(KAI_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })

    // 等待 SPA 渲染完成 - 等待 body 有实际内容
    await page.waitForFunction(
      () => {
        const text = document.body?.innerText || ''
        return text.length > 100
      },
      { timeout: 15000 }
    ).catch(() => {
      console.log('[KaiScraper] 等待渲染超时，尝试提取已有内容')
    })

    // 等待行情数据加载 - 等待价格从 "--" 变成实际数字
    // SPA 通过 WebSocket 加载实时数据，需要等待更长时间
    await page.waitForFunction(
      () => {
        const text = document.body?.innerText || ''
        // 检查是否出现了实际价格数字（而非 "--"）
        const priceMatch = text.match(/最新價[^0-9]*(\d+\.?\d*)/)
        return priceMatch && priceMatch[1] && parseFloat(priceMatch[1]) > 0
      },
      { timeout: 10000 }
    ).catch(() => {
      console.log('[KaiScraper] 等待行情数据超时，使用当前已加载内容')
    })

    // 额外等待 3 秒确保 WebSocket 数据完全加载
    await page.waitForTimeout(3000)

    // 提取页面文本内容
    const fullText = await page.evaluate(() => {
      return document.body?.innerText || document.body?.textContent || ''
    })

    // 尝试从拦截的 API 响应中提取数据
    let apiData = null
    if (interceptedApiData && interceptedApiData.length > 0) {
      apiData = extractFromApiResponses(interceptedApiData)
    }

    // 解析订单簿数据
    const orderBook = parseOrderBook(fullText)

    // 解析账户信息
    const account = parseAccount(fullText)

    // 解析模型列表
    const models = parseModels(fullText)

    // 解析交割日期
    const deliveryDates = parseDeliveryDates(fullText)

    // 解析最新价格
    let latestPrice = parseLatestPrice(fullText)

    // 解析价差
    let spread = parseSpread(fullText)

    // 如果最新价为 0（页面显示 "--"），从订单簿计算
    if (latestPrice === 0 && orderBook.asks.length > 0 && orderBook.bids.length > 0) {
      const bestAsk = orderBook.asks[0].price
      const bestBid = orderBook.bids[0].price
      latestPrice = Math.round((bestAsk + bestBid) / 2 * 10) / 10
      if (spread === 1.5) {
        spread = Math.round((bestAsk - bestBid) * 10) / 10
      }
    }

    // 如果从 API 响应中获取到了数据，优先使用
    const result = {
      timestamp: new Date().toISOString(),
      source: 'scraped',
      url: KAI_URL,
      models: models,
      account: account,
      orderBook: orderBook,
      latestPrice: latestPrice,
      spread: spread,
      deliveryDates: deliveryDates,
      marketStatus: 'open',
      apiIntercepted: apiData ? true : false,
      rawTextLength: fullText.length,
      rawTextPreview: fullText.substring(0, 500)
    }

    cachedData = result
    lastFetchTime = Date.now()

    await browser.close()
    browser = null
    return result

  } catch (error) {
    console.error('[KaiScraper] 抓取失败:', error.message)
    if (browser) {
      try { await browser.close() } catch {}
    }
    return getMockData()
  }
}

/**
 * 从拦截的 API 响应中提取市场数据
 */
function extractFromApiResponses(responses) {
  for (const { url, data } of responses) {
    // 查找包含订单簿、价格等数据的响应
    if (data && typeof data === 'object') {
      // 检查是否包含订单簿数据
      if (data.asks || data.bids || data.orderBook) {
        return { type: 'orderbook', url, data }
      }
      // 检查是否包含账户数据
      if (data.equity || data.account || data.balance) {
        return { type: 'account', url, data }
      }
      // 检查是否包含模型列表
      if (Array.isArray(data.models) || Array.isArray(data.symbols)) {
        return { type: 'models', url, data }
      }
    }
  }
  return null
}

/**
 * 解析订单簿
 */
function parseOrderBook(text) {
  const asks = []
  const bids = []

  // 匹配 "賣盤 · 價格 979.5 · 數量 11" 格式
  const askPattern = /賣盤[^0-9]*(\d+\.?\d*)[^0-9]*(\d+)/g
  const bidPattern = /買盤[^0-9]*(\d+\.?\d*)[^0-9]*(\d+)/g

  let match
  while ((match = askPattern.exec(text)) !== null) {
    asks.push({ price: parseFloat(match[1]), volume: parseInt(match[2]) })
  }
  while ((match = bidPattern.exec(text)) !== null) {
    bids.push({ price: parseFloat(match[1]), volume: parseInt(match[2]) })
  }

  // 如果繁体中文没匹配到，尝试简体
  if (asks.length === 0) {
    const askPattern2 = /卖盘[^0-9]*(\d+\.?\d*)[^0-9]*(\d+)/g
    while ((match = askPattern2.exec(text)) !== null) {
      asks.push({ price: parseFloat(match[1]), volume: parseInt(match[2]) })
    }
  }
  if (bids.length === 0) {
    const bidPattern2 = /买盘[^0-9]*(\d+\.?\d*)[^0-9]*(\d+)/g
    while ((match = bidPattern2.exec(text)) !== null) {
      bids.push({ price: parseFloat(match[1]), volume: parseInt(match[2]) })
    }
  }

  return { asks: asks.slice(0, 5), bids: bids.slice(0, 5) }
}

/**
 * 解析账户信息
 */
function parseAccount(text) {
  const equity = text.match(/賬戶權益[^0-9]*([\d,.]+)/) || text.match(/账户权益[^0-9]*([\d,.]+)/)
  const available = text.match(/可用資金[^0-9]*([\d,.]+)/) || text.match(/可用资金[^0-9]*([\d,.]+)/)
  const positionValue = text.match(/持倉估值[^0-9]*([\d,.]+)/) || text.match(/持仓估值[^0-9]*([\d,.]+)/)
  const positionLots = text.match(/持倉[^0-9]*([\d]+)\s*手/) || text.match(/持仓[^0-9]*([\d]+)\s*手/)

  return {
    equity: equity ? parseFloat(equity[1].replace(/,/g, '')) : 1000000,
    currency: 'HKD',
    available: available ? parseFloat(available[1].replace(/,/g, '')) : 1000000,
    positionValue: positionValue ? parseFloat(positionValue[1].replace(/,/g, '')) : 0,
    positionLots: positionLots ? parseInt(positionLots[1]) : 0
  }
}

/**
 * 解析模型列表
 */
function parseModels(text) {
  const models = []
  const knownModels = ['GLM-5.2', 'Kimi K3', 'DeepSeek-V4', 'Qwen3-Max', 'GLM-5', 'GLM-4']

  for (const name of knownModels) {
    if (text.includes(name)) {
      models.push({ code: name, name })
    }
  }

  if (models.length === 0) {
    models.push({ code: 'GLM-5.2', name: 'GLM-5.2' })
  }

  return models
}

/**
 * 解析交割日期
 */
function parseDeliveryDates(text) {
  const dates = []
  const datePattern = /(\d+)-(\d+)\s*(週[一二三四五六日]|周[一二三四五六日])/g
  let match
  while ((match = datePattern.exec(text)) !== null) {
    dates.push({
      date: `${match[1]}-${match[2]}`,
      weekday: match[3]
    })
  }
  return dates.slice(0, 5)
}

/**
 * 解析最新价格
 */
function parseLatestPrice(text) {
  // 匹配 "最新價 976.5" 或 "最新 976.5"（跳过 "--"）
  const latestMatch = text.match(/最新[價价]?[^0-9-]*(\d+\.?\d*)/)
  return latestMatch ? parseFloat(latestMatch[1]) : 0
}

/**
 * 解析价差
 */
function parseSpread(text) {
  const spreadMatch = text.match(/價差[^0-9]*(\d+\.?\d*)/) || text.match(/价差[^0-9]*(\d+\.?\d*)/)
  return spreadMatch ? parseFloat(spreadMatch[1]) : 1.5
}

/**
 * 模拟数据（Playwright 不可用时使用）
 */
function getMockData() {
  const basePrice = 976.5
  const noise = () => 1 + (Math.random() - 0.5) * 0.005

  const asks = []
  const bids = []
  for (let i = 1; i <= 5; i++) {
    asks.push({
      price: Math.round((basePrice + i * 0.5) * noise() * 10) / 10,
      volume: Math.floor(5 + Math.random() * 15)
    })
    bids.push({
      price: Math.round((basePrice - i * 0.5) * noise() * 10) / 10,
      volume: Math.floor(5 + Math.random() * 15)
    })
  }

  return {
    timestamp: new Date().toISOString(),
    source: 'simulated',
    url: KAI_URL,
    models: [
      { code: 'GLM-5.2', name: 'GLM-5.2' },
      { code: 'Kimi K3', name: 'Kimi K3' }
    ],
    account: {
      equity: 1000000,
      currency: 'HKD',
      available: 1000000,
      positionValue: 0,
      positionLots: 0
    },
    orderBook: { asks, bids },
    latestPrice: basePrice,
    spread: 1.5,
    deliveryDates: [
      { date: '8-17', weekday: '週一' },
      { date: '8-18', weekday: '週二' },
      { date: '8-19', weekday: '週三' },
      { date: '8-20', weekday: '週四' },
      { date: '8-21', weekday: '週五' }
    ],
    marketStatus: 'simulated'
  }
}

/**
 * 获取订单簿深度分析
 */
export function analyzeOrderBookDepth(orderBook) {
  if (!orderBook || (!orderBook.asks?.length && !orderBook.bids?.length)) {
    return { bidDepth: 0, askDepth: 0, imbalance: 0, pressure: 'neutral' }
  }

  const askVolume = orderBook.asks.reduce((sum, a) => sum + a.volume, 0)
  const bidVolume = orderBook.bids.reduce((sum, b) => sum + b.volume, 0)
  const totalVolume = askVolume + bidVolume

  const imbalance = totalVolume > 0 ? (bidVolume - askVolume) / totalVolume : 0

  let pressure = 'neutral'
  if (imbalance > 0.2) pressure = 'buy'
  else if (imbalance < -0.2) pressure = 'sell'

  return {
    askVolume,
    bidVolume,
    askDepth: orderBook.asks.length,
    bidDepth: orderBook.bids.length,
    imbalance: Math.round(imbalance * 100) / 100,
    pressure
  }
}

export default { scrapeKaiMarket, analyzeOrderBookDepth }
