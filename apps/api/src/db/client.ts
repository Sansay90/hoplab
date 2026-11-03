// Подключение к Postgres: пул pg (max 5 — на VPS мало памяти) и Drizzle поверх него.
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

const POOL_MAX = 5

export interface DbOptions {
  /** Ошибка простаивающего соединения (обрыв, перезапуск базы): без обработчика она роняет процесс. */
  onError?: (error: Error) => void
}

/** Drizzle поверх пула; сам пул — `db.$client`, закрывается `db.$client.end()`. Соединение — по первому запросу. */
export function createDb(url: string, options: DbOptions = {}) {
  const pool = new Pool({ connectionString: url, max: POOL_MAX })
  pool.on('error', error => options.onError?.(error))
  return drizzle({ client: pool })
}

export type Db = ReturnType<typeof createDb>
/** Транзакция Drizzle: те же запросы, что у Db. */
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
