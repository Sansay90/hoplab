// Зависимости приложения: buildApp(deps) кладёт их в app.deps. Маршрут берёт app.deps и передаёт сервису нужную
// часть (Pick<Deps, 'db' | 'mailer'>); глобальных синглтонов нет, тесты подменяют зависимости целиком.
import type { Config } from './config'

export interface Deps {
  config: Config
}

declare module 'fastify' {
  interface FastifyInstance {
    deps: Deps
  }
}
