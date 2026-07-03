# 多阶段构建 Dockerfile
FROM node:18-alpine AS base
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# ============================================
# 前端构建阶段
# ============================================
FROM base AS frontend-builder
COPY package*.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# ============================================
# 后端构建阶段
# ============================================
FROM base AS backend-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN pnpm install --frozen-lockfile --prod

# ============================================
# 生产环境
# ============================================
FROM node:18-alpine AS production
WORKDIR /app

# 安装 tini 用于进程管理
RUN apk add --no-cache tini

# 复制后端依赖
COPY --from=backend-builder /app/server/node_modules ./server/node_modules

# 复制后端代码
COPY server/package.json server/index.js ./server/
COPY server/config ./server/config
COPY server/routes ./server/routes
COPY server/middleware ./server/middleware

# 复制前端构建产物
COPY --from=frontend-builder /app/dist ./dist

# 创建数据目录
RUN mkdir -p /app/data && chown -R node:node /app/data

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

# 暴露端口
EXPOSE 3000

# 使用 tini 作为 PID 1
ENTRYPOINT ["/sbin/tini", "--"]

# 启动应用
CMD ["node", "server/index.js"]

# ============================================
# 开发环境
# ============================================
FROM base AS development
WORKDIR /app

# 复制所有 package 文件
COPY package*.json pnpm-lock.yaml ./
COPY server/package*.json ./server/

# 安装所有依赖
RUN pnpm install

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 3000 5173

# 启动开发服务器（前端）
CMD ["pnpm", "dev", "--host", "0.0.0.0"]
