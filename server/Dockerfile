FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN mkdir -p data
ENV PORT=3001
ENV DB_PATH=./data/tokenloan.db
EXPOSE 3001
CMD ["node", "src/index.js"]
