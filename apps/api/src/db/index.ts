// Публичный вход базы: подключение и миграции. Таблицы — schema.ts, запросы разделов — в их queries.ts.
export { createDb } from './client'
export type { Db } from './client'
export { migrateDb } from './migrate'
