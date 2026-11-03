# API Hoplab на Fastify, порт 8000. Монорепа pnpm: контекст сборки — корень репозитория.
#   docker build -f apps/api/Dockerfile -t hoplab-api .
#   docker run -p 8000:8000 --env-file .env hoplab-api

FROM node:24-alpine AS build
RUN npm install -g pnpm@10.33.0
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/core/package.json packages/core/
RUN pnpm install --frozen-lockfile --filter @hoplab/api...
COPY tsconfig.base.json ./
COPY packages/core packages/core
COPY apps/api apps/api
# бандл: @hoplab/core внутрь, остальные зависимости — внешние
RUN pnpm --filter @hoplab/api build
# только прод-зависимости api (без core: он уже в бандле)
RUN pnpm --filter @hoplab/api deploy --legacy --prod /out && cp -r apps/api/dist /out/dist

FROM node:24-alpine
# tzdata — чтобы TZ действовал (в alpine часовых поясов нет)
RUN apk add --no-cache tzdata
WORKDIR /app
ENV NODE_ENV=production \
    TZ=Europe/Moscow \
    SERVICE_HOST=0.0.0.0 \
    SERVICE_PORT=8000
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /out/dist ./dist
COPY --from=build --chown=node:node /out/package.json ./
USER node
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8000/api/health || exit 1
CMD ["node", "dist/main.mjs"]
