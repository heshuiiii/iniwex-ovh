# 阶段一：前端静态资源构建
FROM node:18-alpine AS frontend-builder

ARG VITE_BUILD_CHANNEL=beta
ENV VITE_BUILD_CHANNEL=${VITE_BUILD_CHANNEL}

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY src ./src
COPY public ./public
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig*.json ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY components.json ./
COPY eslint.config.js ./

RUN npm run build

# 阶段二：生产运行环境（Python 后端 + Nginx 反向代理前端）
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends nginx gcc ca-certificates tzdata && \
    ln -snf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && echo Asia/Shanghai > /etc/timezone && \
    rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend/*.py /app/backend/
COPY backend/.env /app/backend/.env

RUN mkdir -p /app/backend/data /app/backend/cache /app/backend/logs

# 复制前端编译出的静态文件到 Nginx
COPY --from=frontend-builder /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# 启动脚本
RUN echo '#!/bin/sh\n\
PORT="19998"\n\
cd /app/backend && python app.py &\n\
nginx -g "daemon off;"\n' > /start.sh && chmod +x /start.sh

EXPOSE 80

ENV PYTHONUNBUFFERED=1
ENV PORT=19998
ENV TZ=Asia/Shanghai

CMD ["/start.sh"]
