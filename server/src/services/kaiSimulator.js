/**
 * KAI 市场模拟引擎
 *
 * 从 hongkong.kai.com 的 JS bundle 逆向提取的确定性模拟逻辑。
 * 使用种子哈希 + PRNG 生成与原平台一致的市场数据：
 * - 合约价格（锚定价 + 实时波动）
 * - 订单簿（买盘/卖盘深度）
 * - 成交记录
 * - 账户信息
 * - 交割状态
 *
 * 纯 JavaScript 实现，无需 Playwright/浏览器，可在任何 Node.js 环境运行。
 */

// ==================== 哈希与 PRNG ====================

function yt(t) {
  let e = 1779033703 ^ t.length
  for (let n = 0; n < t.length; n++)
    e = Math.imul(e ^ t.charCodeAt(n), 3432918353),
    e = e << 13 | e >>> 19
  return e >>> 0
}

function tn(t) {
  let e = t | 0
  return function () {
    e = e + 1831565813 | 0
    let n = Math.imul(e ^ e >>> 15, 1 | e)
    n = n + Math.imul(n ^ n >>> 7, 61 | n) ^ n
    return ((n ^ n >>> 14) >>> 0) / 4294967296
  }
}

function TC(t) {
  let e = Math.imul(t ^ t >>> 16, 2146121005)
  e = Math.imul(e ^ e >>> 15, 2221713035)
  return (e ^ e >>> 16) >>> 0
}

const G0 = t => TC(yt(t)) / 4294967296

// ==================== 常量 ====================

const Tn = (t, e, n) => Math.min(n, Math.max(e, t))
const Kt = 0.5
const Vn = t => Math.round(t / Kt) * Kt
const Io = [{ id: "GLM52", name: "GLM-5.2", base: 780 }, { id: "KIMIK3", name: "Kimi K3", base: 640 }]
const Ul = [{ id: "EA1", name: "东亚一区" }]
const Gi = [{ id: "C256", name: "统一上下文上限 256K", factor: 1 }]
const Rs = 1e6
const oc = 60
const xC = 0.5
const wC = [.55, .5, .5, .5, .5, .55, .7, .85, .95, 1.25, 1.3, 1.25, 1, 1.05, 1.3, 1.35, 1.3, 1.25, 1.2, 1.15, 1.5, 1.45, 1.35, .9]
const EC = [.32, .24, .18, .16, .17, .24, .42, .68, .92, 1.24, 1.42, 1.34, .96, .88, 1.18, 1.38, 1.48, 1.44, 1.26, 1.12, 1.38, 1.56, 1.34, .72]
const SC = 7 * 24
const wo = 4 * 1e3
const CC = 24 * 60 * 60 * 1e3
const ls = 60 * 60 * 1e3
const wp = wo
const AC = 3e3
const LC = 20
const OC = 24
const bp = 0.75
const $C = 14
const ou = [.24, .18, .14, .12, .13, .18, .3, .5, .82, 1.24, 1.52, 1.38, .92, .8, 1.16, 1.43, 1.62, 1.55, 1.28, 1.1, 1.39, 1.68, 1.48, .72]
const zC = [.55, 1.1, 1.12, 1.08, 1.04, .92, .64]
const Sp = [9, 10, 11, 14, 15, 16, 17, 20, 21, 22]
const q0 = new Set(Sp)
const ka = 64
const kC = 512
const MC = 2.25
const NC = [.16, .25, .14, .03]
const jC = 31 * 24
const ic = "HKD"
const ki = new Map()
const r = new Map()

// ==================== 辅助函数 ====================

const Yi = t => String(t).padStart(2, "0")
const HC = t => Io.find(e => e.id === t)
const WC = t => Gi.find(e => e.id === t)
const Zn = (t, e) => { const n = Number(t); return Number.isFinite(n) ? n : e }
const Qn = (t, e = Kt) => Vn(Tn(Zn(t, e), Kt, 99999))
const _C = t => Tn(Math.floor(t * .006 / Kt), 3, 5)

// ==================== 合约代码 ====================

function Ks(t, e, n, s, r) {
  const i = new Date(s)
  const o = `${i.getFullYear()}${Yi(i.getMonth() + 1)}${Yi(i.getDate())}`
  return `KAI-${t}-${e}-${n}-${o}-H${Yi(r)}`
}

function Us(t) {
  const e = t.split("-")
  const n = e[e.length - 1]
  const s = e[e.length - 2]
  return {
    model: e[1],
    region: e[2],
    level: e.slice(3, -2).join("-"),
    ymd: s,
    hour: Number(n.slice(1))
  }
}

function bC(t) {
  return `${Yi(t)}:00–${Yi((t + 1) % 24)}:00`
}

function vp(t, e, n = Date.now()) {
  const s = t + e * 36e5
  return n >= s + 36e5 ? "delivered" : n >= s ? "delivering" : n >= s - oc * 6e4 ? "gated" : "open"
}

function Q0(t) {
  const { ymd: e, hour: n } = Us(t)
  return new Date(`${e.slice(0, 4)}-${e.slice(4, 6)}-${e.slice(6, 8)}T00:00:00`).getTime() + n * ls
}

// ==================== 价格生成 ====================

function xp(t, e, n) {
  const s = Math.min(2, n)
  return Math.round((G0(`${t}#walk-boundary#${e}`) * 2 - 1) * s)
}

function PC(t, e, n) {
  const s = _C(e)
  const r = xp(t, n + 1, s)
  let i = xp(t, n, s)
  const o = [i]
  for (let l = 1; l <= ka; l += 1) {
    const c = ka - l
    const u = []
    for (let m = -3; m <= 3; m += 1) {
      const g = i + m
      if (Math.abs(g) > s || Math.abs(r - g) > 3 * c) continue
      let y = 1
      if (Math.abs(i) >= s - 1) {
        if (m === 0) y = .65
        else if (Math.sign(m) === -Math.sign(i)) y = 1.35
      }
      const S = r - g
      const p = Math.exp(-(S ** 2) / (2 * Math.max(1, c) * MC))
      u.push({ next: g, weight: NC[Math.abs(m)] * y * p })
    }
    const f = u.reduce((m, g) => m + g.weight, 0)
    let d = G0(`${t}#walk-step#${n}#${l}`) * f
    let h = u.at(-1)
    for (const m of u) {
      if (d -= m.weight, d <= 0) { h = m; break }
    }
    i = h.next
    o.push(i)
  }
  return o
}

function Ma(t, e, n) {
  const s = Math.floor(n / ka)
  const r = n - s * ka
  const i = `${t}|${e}|${s}`
  let o = ki.get(i)
  if (!o) {
    o = PC(t, e, s)
    if (ki.size >= kC) ki.delete(ki.keys().next().value)
    ki.set(i, o)
  }
  return Qn(e + o[r] * Kt, e)
}

function Zi(t, e, n = Date.now()) {
  const s = Qn(e)
  const r = Math.floor(Zn(n, Date.now()) / wo) * wo
  const i = Math.floor(r / ls)
  const o = i * ls
  const l = Tn((r - o) / ls, 0, 1)
  const c = l * l * (3 - 2 * l)
  const u = Ma(t, s, i - 1)
  const f = Ma(t, s, i)
  const d = yt(`${t}#live-phase#${i}`)
  const h = d % 6283 / 1e3
  const m = tn(d ^ yt(`${t}#live-amplitude`))
  const g = Math.sin(Math.PI * l)
  const S = Kt * (.9 + m() * 1.1) * g * (Math.sin(l * Math.PI * 4 + h) * .7 + Math.sin(l * Math.PI * 10 + h * .53) * .3)
  return Qn(u + (f - u) * c + S, s)
}

function yp(t, e, n, s, r) {
  const { ymd: i } = Us(t)
  const o = new Date(Date.UTC(Number(i.slice(0, 4)), Number(i.slice(4, 6)) - 1, Number(i.slice(6, 8))))
  const l = new Date(s)
  const c = Number.isNaN(o.getTime()) ? l.getDay() : o.getUTCDay()
  const u = [0, 6].includes(c) ? .96 : 1
  const f = tn(yt(`KAI#delivery-day#${i}`))
  const d = tn(yt(`${t}#basis`))
  const h = .992 + f() * .016
  const m = .9965 + d() * .007
  const g = e?.base ?? Io[0].base
  const y = n?.factor ?? 1
  return Vn(Tn(g * wC[r] * y * u * h * m, xC, 99999))
}

// ==================== 核心接口 ====================

const f = (j, I = Date.now()) => Math.floor(I / wp)

function d(j) {
  const { model: I, level: T, ymd: D, hour: $ } = Us(j)
  const H = new Date(`${D.slice(0, 4)}-${D.slice(4, 6)}-${D.slice(6, 8)}T00:00:00`).getTime()
  return yp(j, HC(I), WC(T), H, $)
}

function h(j, I = Date.now()) {
  const T = d(j)
  return Zi(j, T, I)
}

function m(j, I = Date.now()) {
  const T = h(j, I)
  const D = tn(yt(j + "#depth") ^ f(j, I))
  const $ = [], H = []
  const E = D() > .84 ? 2 : 1
  const P = D() > .84 ? 2 : 1
  for (let _ = 0; _ < OC; _++) {
    const O = _ < LC
    const z = Math.min(7, Math.floor(_ / 3))
    const F = O || D() < bp
    const A = O || D() < bp
    if (F) $.push([Vn(T + Kt * (E + _)), 3 + z + Math.floor(D() * 12)])
    if (A) H.push([Vn(T - Kt * (P + _)), 3 + z + Math.floor(D() * 12)])
  }
  return { mid: T, asks: $, bids: H }
}

function g(j) {
  const { ymd: I, hour: T } = Us(j)
  const D = new Date(`${I.slice(0, 4)}-${I.slice(4, 6)}-${I.slice(6, 8)}T00:00:00`).getTime()
  return vp(D, T)
}

function S(j) {
  const I = Date.now()
  const { mid: T, asks: D, bids: $ } = m(j, I)
  const H = d(j)
  return {
    mid: T,
    last: T,
    chg: Vn(T - H),
    anchor: H,
    asks: D,
    bids: $,
    updatedAt: f(j, I) * wp
  }
}

function p(j) {
  if (!r.has(j)) {
    const I = tn(yt(j + "#trades"))
    const T = d(j)
    const D = Date.now()
    const $ = []
    let H = D - 36e5 + Math.floor(I() * 3e5)
    while (H < D - 6e4) {
      const E = I() > .5 ? "buy" : "sell"
      $.push({
        at: H,
        price: Zi(j, T, H),
        qty: 1 + Math.floor(I() * 12),
        side: E
      })
      H += (60 + Math.floor(I() * 180)) * 1e3
    }
    r.set(j, $)
  }
  return r.get(j)
}

// ==================== 容量计算 ====================

function Y0(t, e, n, s) {
  const r = yt(`${t}#capacity`)
  const i = 96 + r % 81
  const o = .06 + (r >>> 8) % 5 / 100
  const l = Math.max(4, Math.round(i * o))
  const c = Math.max(0, (n - s) / ls)
  const u = 1 - Tn(c / (30 * 24), 0, 1)
  const f = q0.has(e) ? .07 : 0
  const d = (r >>> 16) % 7 / 100
  const h = Tn(.16 + Math.pow(u, .78) * .68 + f + d, .16, .92)
  const m = Math.min(i - l, Math.max(0, Math.round(i * h)))
  const g = i - l - m
  return {
    at: s,
    verifiedTpm: i * Rs,
    lockedTpm: m * Rs,
    riskReserveTpm: l * Rs,
    availableTpm: g * Rs
  }
}

function RC(t, { now: e = Date.now() } = {}) {
  const n = Zn(e, Date.now())
  const s = Us(t)
  const r0 = Q0(t)
  const i = Y0(t, s.hour, r0, n)
  return {
    ...i,
    lockedRatio: i.verifiedTpm ? i.lockedTpm / i.verifiedTpm : 0,
    updatedAt: n
  }
}

function IC(t, e, n, s) {
  const r = Tn(Zn(s, n), n, n + ls)
  const i = Math.floor((r - n) / wo)
  let o = Zi(t, e, n), l = o
  for (let u = 1; u <= i; u += 1) {
    const f = Zi(t, e, n + u * wo)
    o = Math.max(o, f)
    l = Math.min(l, f)
  }
  const c = Zi(t, e, r)
  return { high: Math.max(o, c), low: Math.min(l, c) }
}

function DC(t, { anchor: e, last: n, status: s = "open", now: r0 = Date.now(), from: i, to: o, intervalMs: l = ls } = {}) {
  const c = Zn(r0, Date.now())
  const u = Math.max(60 * 1e3, Math.floor(Zn(l, ls)))
  const f = Math.min(Zn(o, c), c)
  const d = Math.floor(f / u) - SC + 1
  const h = Zn(i, d * u)
  const m = Math.floor(h / u)
  const g = Math.max(m, Math.floor(Math.max(h, f - 1) / u))
  const y = Math.max(m, g - jC + 1)
  const S0 = Us(t)
  const p0 = Q0(t)
  const v = p0 - oc * 60 * 1e3
  const x = Qn(e, Qn(n, 100))
  const w = Qn(n, x)
  const C = [], M = []
  for (let L = y; L <= g; L += 1) {
    const R = L * u
    const B = R + u
    const j = R <= c && c < B
    const I = tn(yt(`${t}#ohlc#${L}`))
    const T = Ma(t, x, L - 1)
    const D = j ? w : Ma(t, x, L)
    const $ = IC(t, x, R, j ? c : B)
    const H = Qn(Math.max(T, D, $.high), x)
    const E = Qn(Math.max(Kt, Math.min(T, D, $.low)), x)
    const P = new Date(R).getHours()
    const _ = 1 + (1 - Tn((p0 - R) / (30 * CC), 0, 1)) * .5
    const O = q0.has(S0.hour) ? 1.18 : S0.hour <= 5 ? .78 : 1
    const z = S0.model === "KIMIK3" ? 1.18 : 1
    const F = [0, 6].includes(new Date(R).getDay()) ? .72 : 1
    const A = j ? Tn((c - R) / u, .08, 1) : 1
    const V = Math.max(1, Math.round((7 + I() * 7) * EC[P] * _ * O * z * F * A))
    const G = Math.max(1, Math.round(V / (2.8 + I() * 2.4)))
    C.push({ startAt: R, endAt: B, open: T, high: H, low: E, close: D, volumeLots: V, tradeCount: G })
    M.push(Y0(t, S0.hour, p0, Math.min(B, c)))
  }
  const k0 = M.at(-1)
  const N = k0 != null && k0.verifiedTpm ? k0.lockedTpm / k0.verifiedTpm : 0
  return {
    code: t,
    asOf: c,
    intervalMs: u,
    currency: ic,
    deliveryStartAt: p0,
    gateAt: v,
    remainingToGateMs: v - c,
    status: s,
    candles: C,
    capacitySeries: M,
    capacity: k0 ? { ...k0, lockedRatio: N, updatedAt: c } : null
  }
}

// ==================== 合约信息 ====================

function an(t) {
  const { model: e, region: n, level: s, ymd: r, hour: i } = Us(t)
  const o = new Date(`${r.slice(0, 4)}-${r.slice(4, 6)}-${r.slice(6, 8)}T00:00:00`).getTime()
  const l = Io.find(f => f.id === e)
  return {
    model: e,
    region: n,
    level: s,
    hour: i,
    modelName: l?.name ?? e,
    regionName: Ul.find(f => f.id === n)?.name ?? n,
    levelName: Gi.find(f => f.id === s)?.name ?? s,
    lot: "一手 = 每个 60 秒窗口持续可用 1,000,000 加权 TPM",
    dayStart: o,
    startTs: o + i * 36e5,
    endTs: o + (i + 1) * 36e5
  }
}

// ==================== 平台对象 ====================

const B = {
  listHours({ model: j, region: I, level: T, day: D }) {
    const $ = Date.now()
    return Array.from({ length: 24 }, (H, E) => {
      const P = Ks(j, I, T, D, E)
      const _ = h(P, $)
      const O = d(P)
      return {
        code: P,
        hour: E,
        label: bC(E),
        status: vp(D, E, $),
        last: _,
        chg: Vn(_ - O)
      }
    })
  },

  getMeta() {
    return { models: Io, regions: Ul, levels: Gi }
  },

  getQuote(j) {
    const { last: I, chg: T, asks: D, bids: $, updatedAt: H } = S(j)
    return {
      code: j,
      last: I,
      chg: T,
      bid: $[0]?.[0] ?? null,
      ask: D[0]?.[0] ?? null,
      status: g(j),
      updatedAt: H
    }
  },

  getBook: S,
  getTrades: j => p(j),

  getContractMarket(j, I = {}) {
    const T = Date.now()
    return DC(j, { ...I, anchor: d(j), last: h(j, T), status: g(j), now: T })
  },

  getCapacityHeatmap({ model: j, region: I, level: T, days: D = [] }) {
    const $ = Date.now()
    return {
      asOf: $,
      rows: D.map(H => ({
        day: H,
        hours: Array.from({ length: 24 }, (E, P) => {
          const _ = Ks(j, I, T, H, P)
          const O = g(_)
          const z = RC(_, { now: $ })
          return {
            code: _,
            hour: P,
            status: O,
            verifiedTpm: z?.verifiedTpm ?? 0,
            availableTpm: z?.availableTpm ?? 0,
            lockedTpm: z?.lockedTpm ?? 0,
            riskReserveTpm: z?.riskReserveTpm ?? 0
          }
        })
      }))
    }
  },

  getDashboardSource: () => ({ scope: "platform", kind: "simulation" }),
  getBillingSource: () => ({ kind: "simulation", coverage: "partial", limit: 200 }),

  getQuotes(j) {
    const I = {}
    for (const T of j) I[T] = B.getQuote(T)
    return I
  },

  getAccount() {
    return {
      cash: Rs,
      frozen: 0,
      avail: Rs,
      equity: Rs,
      posValue: 0,
      posHands: 0,
      updatedAt: Date.now()
    }
  }
}

// ==================== API 适配层 ====================

/**
 * 获取当前 HKT 时间下的交易合约代码
 */
function getCurrentContractCode(modelId = "GLM52") {
  const now = new Date()
  // 转换为香港时间 (UTC+8)
  const hkt = new Date(now.getTime() + 8 * 3600000)
  const year = hkt.getUTCFullYear()
  const month = hkt.getUTCMonth() + 1
  const day = hkt.getUTCDate()
  const hour = hkt.getUTCHours()
  const ymd = `${year}${Yi(month)}${Yi(day)}`
  const dayStart = new Date(`${year}-${Yi(month)}-${Yi(day)}T00:00:00`).getTime()

  // 找当前可交易的合约
  // 优先找当前小时，如果当前小时不可交易，找下一个交易小时
  let currentHour = hour
  let status = vp(dayStart, currentHour, now.getTime())

  // 如果当前合约已交割或关闸，找下一个交易小时
  if (status === "delivered" || status === "gated") {
    const nextHour = Sp.find(h => h > hour)
    if (nextHour !== undefined) {
      currentHour = nextHour
    } else {
      // 如果今天没有更多交易小时，用明天的第一个小时
      const tomorrow = new Date(dayStart + 86400000)
      return Ks(modelId, "EA1", "C256", tomorrow.getTime(), Sp[0])
    }
  }

  // 如果当前小时不在交易时间内，找下一个交易小时
  if (!q0.has(currentHour)) {
    const nextHour = Sp.find(h => h > hour)
    if (nextHour !== undefined) {
      currentHour = nextHour
    } else {
      currentHour = Sp[0]
      // 用明天的
      const tomorrow = new Date(dayStart + 86400000)
      return Ks(modelId, "EA1", "C256", tomorrow.getTime(), currentHour)
    }
  }

  return Ks(modelId, "EA1", "C256", dayStart, currentHour)
}

/**
 * 生成交割日期列表
 */
function generateDeliveryDates(hkt) {
  const dates = []
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
  for (let i = 0; i < 7; i++) {
    const d = new Date(hkt.getTime() + i * 86400000)
    dates.push({
      date: `${d.getUTCMonth() + 1}-${d.getUTCDate()}`,
      weekday: weekdays[d.getUTCDay()]
    })
  }
  return dates
}

// 缓存
let cachedData = null
let lastFetchTime = 0
const CACHE_TTL = 5000 // 5秒缓存

/**
 * 获取 KAI 市场数据（与 scrapeKaiMarket 返回格式一致）
 */
export function getKaiMarketData() {
  // 检查缓存
  if (cachedData && Date.now() - lastFetchTime < CACHE_TTL) {
    return { ...cachedData, source: 'cache', cached: true }
  }

  const now = new Date()
  const hkt = new Date(now.getTime() + 8 * 3600000)

  // 为两个模型生成合约
  const results = []
  for (const model of Io) {
    const code = getCurrentContractCode(model.id)
    const quote = B.getQuote(code)
    const book = B.getBook(code)
    const trades = B.getTrades(code)
    const info = an(code)

    results.push({
      modelId: model.id,
      modelName: model.name,
      contractCode: code,
      contractInfo: info,
      quote,
      orderBook: {
        asks: book.asks.map(([price, vol]) => ({ price, volume: vol })),
        bids: book.bids.map(([price, vol]) => ({ price, volume: vol }))
      },
      latestPrice: quote.last,
      spread: quote.ask && quote.bid ? Math.round((quote.ask - quote.bid) * 10) / 10 : 0.5,
      status: quote.status,
      trades: trades.slice(-10).reverse(), // 最近10笔成交
      chg: quote.chg
    })
  }

  // 使用第一个模型（GLM-5.2）作为主数据
  const primary = results[0]
  const result = {
    timestamp: new Date().toISOString(),
    source: 'simulated',
    url: 'https://hongkong.kai.com/',
    models: Io.map(m => ({ code: m.name, name: m.name })),
    account: B.getAccount(),
    orderBook: primary.orderBook,
    latestPrice: primary.latestPrice,
    spread: primary.spread,
    deliveryDates: generateDeliveryDates(hkt),
    marketStatus: primary.status,
    // 扩展数据
    allModels: results,
    contractCode: primary.contractCode,
    contractInfo: primary.contractInfo,
    trades: primary.trades,
    meta: B.getMeta(),
    dashboardSource: B.getDashboardSource()
  }

  cachedData = result
  lastFetchTime = Date.now()
  return result
}

/**
 * 获取所有合约列表（当前日）
 */
export function getContractList() {
  const now = new Date()
  const hkt = new Date(now.getTime() + 8 * 3600000)
  const year = hkt.getUTCFullYear()
  const month = hkt.getUTCMonth() + 1
  const day = hkt.getUTCDate()
  const dayStart = new Date(`${year}-${Yi(month)}-${Yi(day)}T00:00:00`).getTime()

  const contracts = []
  for (const model of Io) {
    const hours = B.listHours({
      model: model.id,
      region: "EA1",
      level: "C256",
      day: dayStart
    })
    contracts.push({
      model: model.id,
      modelName: model.name,
      hours
    })
  }
  return contracts
}

/**
 * 获取指定合约的详细市场数据
 */
export function getContractDetail(code) {
  const quote = B.getQuote(code)
  const book = B.getBook(code)
  const trades = B.getTrades(code)
  const market = B.getContractMarket(code)
  const info = an(code)

  return {
    code,
    info,
    quote,
    orderBook: {
      asks: book.asks.map(([price, vol]) => ({ price, volume: vol })),
      bids: book.bids.map(([price, vol]) => ({ price, volume: vol }))
    },
    trades: trades.slice(-20).reverse(),
    market,
    capacity: RC(code)
  }
}

/**
 * 分析订单簿深度
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

export default {
  getKaiMarketData,
  getContractList,
  getContractDetail,
  analyzeOrderBookDepth,
  B
}
