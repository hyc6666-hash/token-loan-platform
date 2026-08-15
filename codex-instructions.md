# Codex 开发指引

## 项目背景

本项目是"北京Token贷 · 词元金融服务平台"的高保真原型，当前为单HTML文件。以下是指引用Codex进行后续开发的建议。

## 当前技术状态

- **文件**：`index.html`（约100KB，含全部CSS/JS）
- **依赖**：仅Font Awesome 6 CDN（图标）
- **无框架**：纯原生HTML/CSS/JS
- **云部署**：已部署在WorkBuddy Cloud（workbuddy.link）

## 开发路径建议

### Phase 1: 项目重构（拆分单文件）
```
token-loan-platform/
├── index.html
├── css/
│   ├── variables.css    # CSS变量（颜色、间距等）
│   ├── base.css         # 基础样式
│   ├── components.css   # 组件样式
│   ├── sections.css     # 各板块样式
│   └── responsive.css   # 响应式
├── js/
│   ├── main.js          # 主逻辑（导航、滚动等）
│   ├── counter.js       # 数字滚动
│   ├── calculator.js    # 额度计算器
│   ├── map.js           # 产业地图交互
│   └── modal.js         # 弹窗/表单
├── assets/
│   └── images/          # 图片资源
└── data/
    ├── policies.json    # 政策数据
    ├── products.json    # 产品数据
    └── cases.json       # 案例数据
```

### Phase 2: 后端API
- 申请表单提交接口
- 额度计算逻辑服务端验证
- 政策内容管理CMS
- 用户系统（企业注册/登录）

### Phase 3: 真实数据接入
- Kai TPM数据API对接
- 政策数据动态更新
- 案例库管理

## 关键交互功能（需保留）

1. **数字滚动动画**：首页数据看板
2. **额度计算器**：滑块输入 → 实时计算 → 匹配产品
3. **SVG产业地图**：标记点点击 → 弹窗详情
4. **FAQ折叠**：点击展开/收起
5. **申请弹窗**：底部滑出表单 + Toast提交反馈
6. **导航锚点**：平滑滚动到对应section
7. **响应式**：移动端汉堡菜单

## CSS变量参考

```css
:root {
  --blue-deep: #1e40af;
  --blue-main: #2563eb;
  --blue-bright: #3b82f6;
  --purple-deep: #5b21b6;
  --purple-mid: #7c3aed;
  --purple-light: #a78bfa;
  --cyan: #06b6d4;
  --bg-dark: #0f2140;
  --bg-mid: #1a1a5e;
  --bg-card: #2d1b69;
  --text-main: #1e293b;
  --text-body: #475569;
  --text-muted: #94a3b8;
  --bg-light: #f8fafc;
  --white: #ffffff;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
}
```

## 政策原文链接（已内嵌）

- 北京市智能体措施：https://www.beijing.gov.cn/zhengce/zhengcefagui/202607/t20260723_4781085.html
- 亦庄词元十条：https://www.ncsti.gov.cn/kjdt/scyq/bjjjjskfq/jkdt/202608/t20260807_252627.html
- OPC行动方案：https://www.beijing.gov.cn/zhengce/zhengcefagui/202606/t20260622_4710194.html
- 国家数据局：http://www.jjckb.cn/20260729/9f0aa4b3dd5d4811869c4d3fee1090b8/c.html

## 注意事项

1. **Kai定位**：技术合作方，不是平台主体。只在关于我们板块用信息条提及
2. **政策时效**：所有政策为2026年7-8月发布，页面上需保持"最新"标签
3. **北京特色**：OPC概念是北京独有，需单独展示
4. **数据准确性**：算力券/数据券各1亿、词元券1亿、最高2000万/500万等数据必须精确
5. **预留位**：银行合作Logo位（中国银行/招行/中信/工行/建行等）
