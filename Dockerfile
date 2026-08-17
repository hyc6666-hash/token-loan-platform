FROM node:18-slim

WORKDIR /app

# 复制 package 文件并安装依赖
COPY server/package*.json ./
RUN npm install --production

# 复制服务端代码
COPY server/ ./

# 创建数据目录
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "src/index.js"]
