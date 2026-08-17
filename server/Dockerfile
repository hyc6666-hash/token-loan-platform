FROM node:24-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --production --registry=https://registry.npmmirror.com
COPY . .
RUN mkdir -p data
ENV PORT=3001
ENV DB_PATH=./data/quant.db
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "--experimental-sqlite", "src/index.js"]
