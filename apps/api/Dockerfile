FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY tsconfig*.json ./
COPY scripts ./scripts
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=builder /app/dist ./dist
COPY src/db/migrations ./dist/db/migrations
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s \
  CMD wget -qO- http://localhost:3001/api/health || exit 1
CMD ["node", "dist/server.js"]
