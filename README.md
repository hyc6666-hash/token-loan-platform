# 北京Token贷 · 词元金融服务平台

> 服务北京AI算力企业 ｜ 助力词元经济高质量发展
> 技术合作方：Kai 企业模型服务容量市场（提供TPM数据支持）

## 项目概述

面向北京AI算力企业、大模型创业公司及OPC（一人公司）创业者的综合性金融服务门户。整合Token贷、算力贷、OPC贷等金融产品，提供政策解读与在线申请预约服务。

**v4.0 全栈动态版** — 已从静态HTML升级为 React + Node.js + SQLite 全栈应用。

## 快速启动

```bash
# 1. 安装后端依赖
cd server && npm install

# 2. 安装前端依赖
cd ../client && npm install

# 3. 初始化数据库（首次运行）
cd ../server && node src/database/init.js

# 4. 启动后端（端口 3001）
cd server && npm run dev

# 5. 启动前端（端口 5173，另开终端）
cd client && npm run dev

# 6. 浏览器访问
# 前端：http://localhost:5173
# 后端API：http://localhost:3001/api/health
```

**默认管理员账号：** 手机 13800000000 / 密码 admin123

## 文件结构

```
token-loan-platform/
├── index.html              # 原静态版（保留参考）
├── client/                 # 前端（React + Vite）
│   ├── index.html
│   ├── vite.config.js      # Vite配置（含API代理）
│   ├── package.json
│   └── src/
│       ├── main.jsx        # 入口
│       ├── App.jsx         # 路由配置
│       ├── context/
│       │   └── AuthContext.jsx   # 全局认证状态
│       ├── services/
│       │   └── api.js            # API调用封装
│       ├── components/           # 可复用组件
│       │   ├── Navbar.jsx        # 导航栏
│       │   ├── Hero.jsx          # 首页Hero区
│       │   ├── Products.jsx      # 产品中心
│       │   ├── Policy.jsx        # 政策解读
│       │   ├── Cases.jsx         # 成功案例
│       │   ├── Calculator.jsx    # 额度计算器
│       │   ├── ApplyGuide.jsx    # 申请指南
│       │   ├── About.jsx         # 关于我们
│       │   ├── Footer.jsx        # 页脚
│       │   ├── FloatApply.jsx    # 浮动申请按钮
│       │   └── Toast.jsx         # 提示组件
│       ├── pages/                # 页面组件
│       │   ├── HomePage.jsx      # 首页
│       │   ├── LoginPage.jsx     # 登录
│       │   ├── RegisterPage.jsx  # 注册
│       │   ├── DashboardPage.jsx # 用户仪表盘
│       │   └── AdminPage.jsx     # 管理后台
│       └── styles/
│           └── global.css        # 全局样式
├── server/                 # 后端（Node.js + Express + SQLite）
│   ├── package.json
│   ├── .env                # 环境变量
│   └── src/
│       ├── index.js        # Express入口
│       ├── database/
│       │   └── init.js     # 数据库建表+种子数据
│       ├── middleware/
│       │   └── auth.js     # JWT认证中间件
│       └── routes/
│           ├── auth.js          # 认证API
│           ├── applications.js  # 申请API
│           ├── calculator.js    # 计算器API
│           ├── admin.js         # 管理API
│           └── content.js       # 内容API
├── design-spec.md          # 设计规范
├── content-brief.md        # 内容素材
└── changelog.md            # 版本记录
```

## API 接口一览

| 方法 | 路径 | 说明 | 需登录 |
|------|------|------|--------|
| POST | /api/auth/register | 企业注册 | 否 |
| POST | /api/auth/login | 企业登录 | 否 |
| GET | /api/auth/me | 获取当前用户 | 是 |
| POST | /api/applications | 提交申请 | 是 |
| GET | /api/applications/my | 我的申请列表 | 是 |
| PATCH | /api/applications/:id/withdraw | 撤回申请 | 是 |
| POST | /api/calculator/estimate | 额度测算 | 否 |
| GET | /api/content/policies | 政策列表 | 否 |
| GET | /api/content/products | 产品列表 | 否 |
| GET | /api/content/cases | 案例列表 | 否 |
| GET | /api/admin/stats | 管理统计 | 管理员 |
| GET | /api/admin/applications | 所有申请 | 管理员 |
| PATCH | /api/admin/applications/:id/review | 审核申请 | 管理员 |
| GET | /api/admin/users | 用户列表 | 管理员 |

## 技术栈

### 前端
- **React 18** — 组件化UI框架
- **React Router 6** — 前端路由（SPA单页应用）
- **Vite 5** — 极速开发构建工具
- **CSS Variables** — 设计令牌系统

### 后端
- **Node.js 20** — JavaScript运行时
- **Express 4** — Web框架
- **better-sqlite3** — SQLite数据库（无需安装数据库服务）
- **bcryptjs** — 密码加密
- **jsonwebtoken** — JWT无状态认证
- **uuid** — 唯一ID生成

### 数据库
- **SQLite** — 文件型数据库，零配置
- 数据文件：`server/data/tokenloan.db`
- WAL模式提升并发性能

## 全栈开发教学要点

### 1. 前后端分离架构
- 前端（5173端口）通过Vite代理访问后端API（3001端口）
- 开发时无跨域问题，生产环境前端build后由Express托管静态文件

### 2. JWT认证流程
```
用户登录 → 服务器验证密码 → 生成JWT token返回
→ 前端存token到localStorage → 每次请求Header带Bearer token
→ 服务器中间件验证token → 放行或拒绝
```

### 3. 数据库设计
- **users表**：企业用户信息+密码哈希
- **applications表**：申请记录+状态机（pending→reviewing→approved/rejected）
- **policies/products/cases表**：CMS可管理的内容数据

### 4. 状态管理
- React Context管理全局登录状态
- 组件内部useState管理局部状态
- API调用集中在services/api.js

### 5. 动态 vs 静态的核心区别
- 静态：内容写死在HTML，改内容=改代码重新部署
- 动态：内容存数据库，管理后台可随时增删改

## 政策原文链接

| 政策 | 来源 |
|------|------|
| 《北京市关于加快智能体引领发展的若干措施》 | https://www.beijing.gov.cn/zhengce/zhengcefagui/202607/t20260723_4781085.html |
| 亦庄"词元十条" | https://www.ncsti.gov.cn/kjdt/scyq/bjjjjskfq/jkdt/202608/t20260807_252627.html |
| OPC创新发展行动方案 | https://www.beijing.gov.cn/zhengce/zhengcefagui/202606/t20260622_4710194.html |
| 国家数据局：鼓励词元应用商业模式创新 | http://www.jjckb.cn/20260729/9f0aa4b3dd5d4811869c4d3fee1090b8/c.html |

## 后续扩展方向

1. **文件上传**：申请材料PDF/图片上传（需加multer中间件+对象存储）
2. **邮件通知**：申请状态变更时自动发邮件（需加nodemailer）
3. **数据可视化**：接入ECharts展示申请趋势图
4. **微信登录**：对接微信OAuth2.0
5. **Kai API对接**：真实TPM数据接口对接
6. **生产部署**：Docker容器化 + Nginx反向代理
