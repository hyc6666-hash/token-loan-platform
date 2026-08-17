# KAI 算力期货量化交易系统

> AI 模型算力期货多策略量化交易平台

## 项目简介

基于 KAI 模型服务容量市场（Model Service Capacity Market）的量化交易系统，支持 4 种 AI 模型（GLM-5.2、DeepSeek-V4、Qwen3-Max、Kimi-K3）的算力期货合约交易，提供多策略组合、AI 策略推荐、全链路风控体系。

## 技术栈

- **前端**: React 18 + Vite + React Router
- **后端**: Node.js + Express + SQLite
- **部署**: Vercel (前端) + 腾讯云 CloudBase (后端)

## 功能模块

| 模块 | 说明 |
|------|------|
| 仪表盘 | 资金体量选择、风险偏好设置、AI 策略推荐、风控概览 |
| 行情 | 4 模型 × 6 区域实时行情、K 线图、技术指标、远期合约 |
| 交易 | 手动下单（限价/市价）、持仓管理、成交记录 |
| 策略 | 6 大策略库、信号生成、多策略组合 |
| 风控 | 风险评分、10 条风控规则、告警管理、应急预案 |
| 设置 | London/HongKong API 密钥配置、系统信息 |

## 本地开发

```bash
# 安装依赖
cd client && npm install
cd server && npm install

# 启动后端
cd server && npm run dev

# 启动前端
cd client && npm run dev
```

## 部署

- **前端 (Vercel)**: push 到 GitHub 自动触发部署
- **后端 (腾讯云)**: CloudBase CloudRun 部署

## License

MIT
