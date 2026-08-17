FROM node:18-slim

# 安装 Playwright 所需的系统依赖 + 中文字体
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libdbus-1-3 libxkbcommon0 libatspi2.0-0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libgbm1 libxss1 libgtk-3-0 libasound2 \
    libpango-1.0-0 libcairo2 libgdk-pixbuf-2.0-0 \
    fonts-noto-cjk fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 复制 package 文件并安装依赖
COPY server/package*.json ./
RUN npm install --production

# 安装 Playwright Chromium 浏览器
RUN npx playwright install chromium

# 复制服务端代码
COPY server/ ./

# 创建数据目录
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "src/index.js"]
