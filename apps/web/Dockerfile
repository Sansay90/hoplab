# Интерфейс Hoplab — сервер Nuxt (Nitro) на порту 3000: каталог и рецепт рендерятся на сервере, остальное — SPA.
# /api он проксирует сервису по NUXT_API_SERVER (в проде nginx отдаёт /api сервису сам, мимо Nuxt).
# Монорепа pnpm: контекст сборки — корень репозитория.
#   docker build -f apps/web/Dockerfile -t hoplab-web .
#   docker run -p 3000:3000 -e NUXT_API_SERVER=http://service:8000 hoplab-web

FROM node:24-alpine AS build
RUN npm install -g pnpm@10.33.0
WORKDIR /repo
# сначала манифесты — слой с зависимостями кэшируется, пока они не менялись
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/core/package.json packages/core/
RUN pnpm install --frozen-lockfile --filter @hoplab/web...
COPY tsconfig.base.json ./
COPY packages/core packages/core
COPY apps/web apps/web
RUN pnpm --filter @hoplab/web build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
# сборка самодостаточна: зависимости сервера — внутри .output
COPY --from=build --chown=node:node /repo/apps/web/.output ./.output
USER node
EXPOSE 3000
# «/» — SPA-оболочка: отвечает и без сервиса, проверяет только сам сервер Nuxt
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:3000/ || exit 1
CMD ["node", ".output/server/index.mjs"]
