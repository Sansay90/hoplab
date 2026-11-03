// Зависимости приложения: buildApp(deps) кладёт их в app.deps. Маршрут берёт app.deps и передаёт сервису нужную
// часть (Pick<Deps, 'db' | 'mailer'>); глобальных синглтонов нет, тесты подменяют зависимости целиком.
import type { Config } from './config'
import type { Db } from './db'

export interface Deps {
  config: Config
  /** База: пул pg и Drizzle; закрывается вместе с приложением (app.close()). */
  db: Db
}

declare module 'fastify' {
  interface FastifyInstance {
    deps: Deps
  }
}
