# 测试构建
FROM node:18.20.4-alpine3.20 as build-stage

# 工作目录
WORKDIR /app

# package
COPY package*.json .

# 设置镜像源
#RUN npm config set registry https://registry.npmmirror.com/

# 安装依赖
RUN npm install

# 全复制
COPY . .

# 构建
RUN npm run build

# production stage
FROM node:18.20.4-alpine3.20 as production-stage

# 设置时区
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 运行bin
COPY --from=build-stage /app/dist /app/bin

# 配置目录
COPY --from=build-stage /app/billing /app/billing
COPY --from=build-stage /app/google /app/google
COPY --from=build-stage /app/template /app/template

# env 文件
COPY --from=build-stage /app/.env.production /app/.env.production
COPY --from=build-stage /app/.env.staging /app/.env.staging

# pm2 ecosystem
COPY --from=build-stage /app/ecosystem.config.json /app/ecosystem.config.json

# 依赖文件
COPY --from=build-stage /app/package.json /app/package.json

# 设置工作目录
WORKDIR /app

# 创建默认 .certeasy
RUN mkdir -p .certeasy/{certificates,challenge}

# 设置镜像源
#RUN npm config set registry https://registry.npmmirror.com/

# 安装生产依赖
RUN npm install --prefer-offline --omit=dev

# 安装PM2
RUN npm install pm2 -g

EXPOSE 9527

# 设置默认环境变量
ENV NODE_ENV=production

CMD ["pm2-runtime", "start", "ecosystem.config.json", "--env", "${NODE_ENV}"]
