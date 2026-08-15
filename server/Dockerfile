FROM node:18-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --production --registry=https://registry.npmmirror.com
COPY . .
RUN mkdir -p data
ENV PORT=3001
ENV DB_PATH=./data/tokenloan.db
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "src/index.js"]
